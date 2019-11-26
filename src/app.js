// Custom Variables:
const apiKey = ''
const orgID = ''

const path = require('path')
const express = require('express')
const hbs = require('hbs')
const app = express()
const dashboard = require('./utils/dashboard')(apiKey)
const Bottleneck = require("bottleneck"); 

const port = process.env.PORT || 3000

// Queues API Calls to prevent Meraki API Call limit
const limiter = new Bottleneck({
    minTime: 225,
    trackDoneStatus: true
  });

// Define paths for express config
const publicDirectoryPath = path.join(__dirname, '../public')
const viewsPath = path.join(__dirname, '../templates/views')
const partialsPath = path.join(__dirname, '../templates/partials')

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
    getAll().then((result) => {
        console.log(result)
        console.log('finished successfully')
        res.setHeader('Content-Type', 'application/json');
        res.send(result)
    }).catch((e) => {
        res.status(400).send(e)
    })
})

app.listen(port, () => {
    console.log('Server running on port '+port)
})

// Main Function to get dashboard data
const getAll = async () => {
    console.log('running getAll function')
    // const orgs = await limiter.schedule(() => dashboard.organizations.list())
    const vpnRules = await limiter.schedule(() => dashboard.organizations.getRules(orgID))
    const getDevices = await limiter.schedule(() => dashboard.organizations.getDeviceStatuses(orgID)) //take out if using set org id
    const devices = await mapDevices(getDevices)
    const devicesVPN = await getVPN(devices)
    const devicesPerf = await getPerf(devicesVPN)

    return [devicesPerf, vpnRules]
}

const mapDevices = async (devicesArr) => {
    let mxarr = []
    const promises = devicesArr.map(async device => {
        let deviceDetails = limiter.schedule(() => dashboard.devices.get(device.networkId, device.serial))
        return deviceDetails
    })
    
    const awaitDevices = await Promise.all(promises)
    for ( let i = 0; i < awaitDevices.length; i++){
        if(awaitDevices[i].hasOwnProperty('wan1Ip') ){ //If has wan1IP then its an MX/Z
            awaitDevices[i].status = devicesArr[i].status
            awaitDevices[i].publicIp = devicesArr[i].publicIp
            mxarr.push(awaitDevices[i]) // Add MX to our MX array
        }
    }
    //Check if MX has HA (only want to show 1 MX)
    for(let i = 0; i < mxarr.length; i++) {
        for(let j = i+1; j < mxarr.length; j++) {
            if(mxarr[j].networkId === mxarr[i].networkId) {
                //check warm spare
                const warmSpare = await limiter.schedule(() => dashboard.networks.getWarmSpare(mxarr[j].networkId))
                console.log(warmSpare)
                for(let l = 0; l < mxarr.length; l++) {
                    if(mxarr[l].serial === warmSpare.spareSerial) {
                        mxarr.splice(l,1)
                    }
                }
            }
        }
    }
    return mxarr
}

const getVPN = async (devicesArr) => {
    let mxarr = []
    const promises = devicesArr.map(async device => {
        var vpn = limiter.schedule(() => dashboard.networks.getSiteToSiteVpn(device.networkId)) //Get MX performance
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
