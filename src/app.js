// Custom Variables:
const config = require('./config')
const apiKey = config.api
const orgID = config.org

const path = require('path')
const express = require('express')
const hbs = require('hbs')
const app = express()
const dashboard = require('./utils/dashboard')(apiKey)
const Bottleneck = require("bottleneck"); 
const fs = require('fs') //Save and Read JSON

//Server port
const port = process.env.PORT || 3000

// Queues API Calls to prevent Meraki API Call limit
const limiter = new Bottleneck({
    minTime: 200,
    trackDoneStatus: true
  });

// Listen to the "failed" event
limiter.on("failed", async (error, jobInfo) => {
    if (jobInfo.retryCount <= 2) { // Here we only retry once
      let backOff = (error.headers['retry-after'] * 1000)
      console.log(`Retrying request in ${backOff}ms!`);
      return backOff;
    }
  });

// Define paths for express config
const publicDirectoryPath = path.join(__dirname, '../public')
const viewsPath = path.join(__dirname, '../templates/views')
const partialsPath = path.join(__dirname, '../templates/partials')
const jsonPath = path.join(__dirname, '../src/json')

const lineBreak = '======================================='

// Setup handlebars engine and views location
app.set('view engine', 'hbs')
app.set('views', viewsPath)
hbs.registerPartials(partialsPath)

// Setup static directory to serve
app.use(express.static(publicDirectoryPath))

// Files to serve
app.get('', (req, res) => {
    res.setHeader("Content-Security-Policy-Report-Only", "default-src *; script-src *; style-src *; img-src *; font-src *;");
    res.render('index', {
        title: 'Home',
    })
})

app.get('/mxs', (req, res) => {
    //Run Timer
    var hrstart = process.hrtime()
    //Main Function
    getMXs().then((result) => {
        //End Timer
        var hrend = process.hrtime(hrstart)
        console.log(lineBreak)
        console.log('Execution time: %ds %dms', hrend[0], hrend[1] / 1000000)
        // console.log(result) //enable for dubbing purposes
        console.log('finished successfully')
        console.log(lineBreak)
        res.setHeader('Content-Type', 'application/json');
        res.send(result)
    }).catch((e) => {
        res.status(400).send(e)
    })
})


//Port Server is running on locally
const server = app.listen(port, () => {
    console.log(`VPN App listening on port ${port}!`)
    start()
})
// Increase the timeout to 15 minutes 
server.timeout = 900000; 

//Startup Script
const start = () => {
    //Run Timer
    var hrstart = process.hrtime()
    //Main Function
    initialise().then((result) => {
        //End Timer
        var hrend = process.hrtime(hrstart)
        console.log(lineBreak)
        console.log('Execution time: %ds %dms', hrend[0], hrend[1] / 1000000)
        console.log('API Calls:', limiter._store._done)
        // console.log(result) //enable for dubbing purposes
        console.log('started successfully')
        console.log(lineBreak)
        storeJson(result)
    }).catch((e) => {
        console.log(e)
    })
}

// Main Function to get dashboard data
const initialise = async () => {
    const apis = await apiCalls()
    console.log('Running main function')
    // const orgs = await limiter.schedule(() => dashboard.organizations.list())  
    const mxArray = await getDevices()
    const warmSpareFilter = await warmSpare(mxArray)
    const devicesVPN = await getVPN(warmSpareFilter)
    const devices = await mapDevices(devicesVPN)
    const devicesPerf = await getPerf(devices)
    const vpnRules = await limiter.schedule(() => dashboard.organizations.getRules(orgID))

    return [devicesPerf, vpnRules]
}

const apiCalls = async () => {
    console.log(lineBreak)
    console.log('Checking ongoing APIs')
    let seconds = 60
    let apis = await limiter.schedule(() => dashboard.api_usage.api_requests(orgID, {timespan: seconds, perPage: 400}))
    let average = ((apis.length / seconds).toFixed(2)/5)*100
    console.log('Average API Calls over last ',seconds,' seconds = ',average, '%')
    var msSetting = (average >= 80) ? 100 : (average >= 60) ? 800 : (average >= 40) ? 600 : (average >= 20) ? 400 : (average >= 0) ? 200 : 200
    console.log('Recommended Bottleneck setting = ', msSetting )
    console.log(lineBreak)
}

const getDevices = async () => {
    let devicesArr = await limiter.schedule(() => dashboard.organizations.getDeviceStatuses(orgID))
    //Filter devices array and return array of MX's
    let filteredDevicesMX = devicesArr.filter(function(device) {
        return device.hasOwnProperty('wan1Ip') //If has wan1IP then its an MX/Z
    })
    const bottleneckTime = limiter._store.storeOptions.minTime*(filteredDevicesMX.length*3.5)
    console.log(lineBreak)
    console.log('Executing Approx.',(Math.floor(filteredDevicesMX.length*3.5)),'calls',' - Estimated Time:', (bottleneckTime / 1000), 's')
    console.log(lineBreak)

    return filteredDevicesMX
}

const warmSpare = async (filteredDevicesMX) => {
    //Check if MX has HA (only want to show primary MX)
    for(let i = 0; i < filteredDevicesMX.length; i++) {
        for(let j = i+1; j < filteredDevicesMX.length; j++) {
            if(filteredDevicesMX[j].networkId === filteredDevicesMX[i].networkId) {
                //check warm spare
                const warmSpare = await limiter.schedule(() => dashboard.networks.getWarmSpare(filteredDevicesMX[j].networkId))
                for(let l = 0; l < filteredDevicesMX.length; l++) {
                    if(filteredDevicesMX[l].serial === warmSpare.spareSerial) {
                        filteredDevicesMX.splice(l,1)
                    }
                }
            }
        }
    }
    return filteredDevicesMX
}

const mapDevices = async (filteredDevicesMX) => {

    //Get MX Device Details and create new array
    const promises = filteredDevicesMX.map(async device => {
        let deviceDetails = limiter.schedule(() => dashboard.devices.get(device.networkId, device.serial))
        return deviceDetails
    })
    let mxarr = await Promise.all(promises)
    //Merge Org MX Device Status Array and Devices Array
    for ( let i = 0; i < filteredDevicesMX.length; i++){
        filteredDevicesMX[i].lat = mxarr[i].lat
        filteredDevicesMX[i].lng = mxarr[i].lng
        filteredDevicesMX[i].model = mxarr[i].model          
    }

    return filteredDevicesMX
}

const getVPN = async (devicesArr) => {
    let mxarr = []
    const promises = devicesArr.map(async device => {
        var vpn = limiter.schedule(() => dashboard.networks.getSiteToSiteVpn(device.networkId)) //Get MX VPN details
        return vpn
    })
    const awaitVPN = await Promise.all(promises)
    for ( let i = 0; i < devicesArr.length; i++){
        if(awaitVPN[i].mode !== 'none'){            // Check is spoke or hub
            devicesArr[i].mode = awaitVPN[i].mode 
            devicesArr[i].hubs = awaitVPN[i].hubs
            let count = 0
            for (let k=0; k < awaitVPN[i].subnets.length; k++) {   //Return subnets
                if(awaitVPN[i].subnets[k].useVpn){
                    count++
                }
            }
            devicesArr[i].subnets = {length: awaitVPN[i].subnets.length, active: count, subnet: awaitVPN[i].subnets}
            mxarr.push(devicesArr[i]) // Add MX to our MX array
        }
    }
    return mxarr
}

const getPerf = async (devicesArr) => {
    const promises = devicesArr.map(async device => {
        if(device.status !== 'offline'){
            let perf = limiter.schedule(() => dashboard.devices.performanceScore(device.networkId, device.serial)) //Get MX performance
            return perf
        } else {
            let perf = {"perfScore": 0}
            return perf
        }
    })
    const awaitPerf = await Promise.all(promises)
    for ( let i = 0; i < devicesArr.length; i++){
            devicesArr[i].perfScore = awaitPerf[i].perfScore
    }
    return devicesArr
}

const storeJson = async (json) => {
    let data = JSON.stringify(json, null, 2);

    fs.writeFile(jsonPath+'/mx.json', data, (err) => {
        if (err) throw err;
        console.log('MX JSON file saved');
    });
}
const getMXs = async () => {
    return existingMX = await readJson()
}

const readJson = async () => {
    let rawdata = fs.readFileSync(jsonPath+'/mx.json');
    let oldMxJson= JSON.parse(rawdata);
    return oldMxJson
}

//Flow
//Get OrgID/DeviceStatuses
//      -- Returns list of all devices's, sort those with WAN1IP property
//          -- Save to Array mxList
//Get Device details # = size of mxList
//      -- append lat, lng, address and model to mxList
//Get Perf score for each online MX
//      -- append to mxList
//Get VPN Details for each MX
//      -- append to mxLit
//Get Org VPN firewall rules
//      -- add to new array
