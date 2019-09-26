//Functions check ip is inside CIDR
//Code thanks to https://tech.mybuilder.com/determining-if-an-ipv4-address-is-within-a-cidr-range-in-javascript/
const ip4ToInt = ip =>
  ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;

const isIp4InCidr = ip => cidr => {
  const [range, bits = 32] = cidr.split('/');
  const mask = ~(2 ** (32 - bits) - 1);
  return (ip4ToInt(ip) & mask) === (ip4ToInt(range) & mask);
};

const isIp4InCidrs = (ip, cidrs) => cidrs.some(isIp4InCidr(ip));

function errorReturn(errorNum, message){
    $("#resultsModal").modal()
    return
}

//--------------------------------------------------------------------------------------------------------------

function ipChecker(srcIP, dstIP){
    //reset tunnels if already loaded
    updateCurveMarker()
    //create array of references to consoles messages and remove existing errors
    var messageArr = []
    var errorResponse = document.getElementById('error-response') 

    for (let l=0; l < 5; l++){
        messageArr.push(document.getElementById('check'+l))
         messageArr[l].classList.remove("check-pass", "check-fail")
         errorResponse.innerHTML = ''
    }
    
    var c = 0
    var mx1 = checkIpSubnet(srcIP)
    var mx2 = checkIpSubnet(dstIP)


    if(typeof mx1 !== 'undefined'){ // Check src subnet exists
    } else {
        messageArr[c].classList.add("check-fail")
        errorResponse.innerHTML = '<b>Source IP: </b>'+srcIP + ' not found.'
        $("#resultsModal").modal()
        return
    }
    if(typeof mx2 !== 'undefined'){ // Check dst subnet exists
        messageArr[c].classList.add("check-pass")
        c++
    } else {
        messageArr[c].classList.add("check-fail")
        errorResponse.innerHTML = '<b>Destination IP: </b>'+dstIP + ' not found.'
        $("#resultsModal").modal()
        c++
        return
    }

    if(mx1.mx !== mx2.mx){ // check subnet's are not on same MX
        messageArr[c].classList.add("check-pass")
        c++
    } else{
        messageArr[c].classList.add("check-fail")
        errorResponse.innerHTML = 'Src and Dst Subnets are on same MX. No VPN chceks required' 
        $("#resultsModal").modal()
        return
    }
    if(mx1.vpn){ // subnet is not enabled for vpn
    } else {
        messageArr[c].classList.add("check-fail")
        errorResponse.innerHTML = 'Src Subnet Not-enabled in VPN' 
        $("#resultsModal").modal()
        return
    }
    if(mx2.vpn){ // subnet is not enabled for vpn
        messageArr[c].classList.add("check-pass") 
        c++
        
    } else {
        messageArr[c].classList.add("check-fail") 
        errorResponse.innerHTML = 'Dst Subnet Not-enabled in VPN' 
        $("#resultsModal").modal()
        return
    }
    
    var srcCheck = checkIpFirewall(srcIP, dstIP) // check outbound firewall rules src to dst
    if(srcCheck){ 
        let firewallRules = ''
        console.log('Source Blocked by firewall rule', srcCheck)
        messageArr[c].classList.add("check-fail") 
        firewallRules += `<div class="card card-body"><div class="card-header ">Outbound Firewall Rules</div><div class="table-responsive"><table class="table"><thead class=" text-primary">
                                    <th>Rule #</th><th>Policy</th><th>Protocl</th><th>Source</th><th>Destination</th><th>Comment</th></thead><tbody>`
        for(let n = 0; n < srcCheck.length; n++){
            firewallRules += '<tr><td>'+srcCheck[n].ruleNum+'</td><td>'+srcCheck[n].policy+'</td><td>'+srcCheck[n].protocol+'</td><td>'+srcCheck[n].srcCidr+'</td><td>'+srcCheck[n].destCidr+'</td><td>'+srcCheck[n].comment+'</td></tr>'
        }
        firewallRules += '</tbody></table></div></div>'

        errorResponse.innerHTML += firewallRules
        $("#resultsModal").modal()
    } else {
    }
    var destCheck = checkIpFirewall(dstIP, srcIP) // check outbound firewall rules dst to src
    if(destCheck) {
        let firewallRules = ''
        console.log('Dest Blocked by firewall rule', destCheck)

        firewallRules += `<div class="card card-body"><div class="card-header ">Return Firewall Rules</div><div class="table-responsive"><table class="table"><thead class=" text-primary">
                                    <th>Rule #</th><th>Policy</th><th>Protocl</th><th>Source</th><th>Destination</th><th>Comment</th></thead><tbody>`
        for(let n = 0; n < destCheck.length; n++){
            firewallRules += `<tr><td>`+destCheck[n].ruleNum+'</td><td>'+destCheck[n].policy+'</td><td>'+destCheck[n].protocol+'</td><td>'+destCheck[n].srcCidr+'</td><td>'+destCheck[n].destCidr+'</td><td>'+destCheck[n].comment+'</td></tr>'
        }
        firewallRules += '</tbody></table></div></div>'
        errorResponse.innerHTML += firewallRules
        messageArr[c].classList.add("check-fail") 
        c++
        $("#resultsModal").modal()
        return
    } else {
        messageArr[c].classList.add("check-pass") 
        c++
    }
        if (!destCheck && !srcCheck){ // connectivity check passed
           console.log(mxList[mx1.mx].mode, mxList[mx2.mx].mode)
            if(mxList[mx1.mx].mode === 'spoke' && mxList[mx2.mx].mode === 'spoke') {// check if spoke to spoke
                var resultObject = search(locations[mx1.mx][4][0].hubId, mxList);
                var mx1Hub = search2(resultObject, locations);
                console.log('Spoke'+mx1.mx, 'connects to Hub'+mx1Hub)
                var resultObject = search(locations[mx2.mx][4][0].hubId, mxList);
                var mx2Hub = search2(resultObject, locations);
                console.log('Spoke'+mx2.mx, 'connects to Hub'+mx2Hub)
                if(mx1Hub === mx2Hub){
                    activeTunnel(mx1Hub, mx1.mx) 
                    activeTunnel(mx2Hub, mx2.mx) 
                } else {
                    activeTunnel(mx1Hub, mx1.mx) 
                    activeTunnel(mx2Hub, mx2.mx) 
                    activeTunnel(mx1Hub, mx2Hub) 
                }

            } else if(mxList[mx1.mx].mode === 'spoke' && mxList[mx2.mx].mode === 'hub'){ //spoke to hub, check matches hubs
                var resultObject = search(locations[mx1.mx][4][0].hubId, mxList);
                var mx1Hub = search2(resultObject, locations);
                if(mx1Hub === mx2.mx){
                    activeTunnel(mx1.mx,mx2.mx)
                } else {
                    activeTunnel(mx1.mx, mx1Hub)
                    activeTunnel(mx1Hub, mx2.mx)
                }
                console.log('Spoke'+mx1.mx, 'connects to Hub'+mx1Hub, '. Hub '+mx1Hub+' connects to Hub: '+mx2.mx)
            } else if(mxList[mx1.mx].mode === 'hub' && mxList[mx2.mx].mode === 'spoke'){ //spoke to hub, check matches hubs
                var resultObject = search(locations[mx2.mx][4][0].hubId, mxList);
                var mx2Hub = search2(resultObject, locations);
                if(mx2Hub === mx1.mx){
                    activeTunnel(mx1.mx,mx2.mx)
                } else {
                    activeTunnel(mx2.mx,mx2Hub)
                    activeTunnel(mx2Hub, mx1.mx)
                }
                console.log('Spoke'+mx2.mx, 'connects to Hub'+mx2Hub, '. Hub '+mx2Hub+' connects to Hub: '+mx1.mx)
            } else { // hub to hub
                activeTunnel(mx1.mx,mx2.mx) 
            }
        }
}

function checkIpSubnet(testIP){
    for(let i=0; i < mxList.length; i++){ //loop MX Array
            for(let j=0; j < mxList[i].subnets.subnet.length; j++){ // Loop each MX's subnet array
                if(isIp4InCidrs(testIP, [mxList[i].subnets.subnet[j].localSubnet])){ //Check ip matches subnet
                    return {
                        mx: i,
                        subnet: j, 
                        vpn: mxList[i].subnets.subnet[j].useVpn
                    }
                }
            }
    }
}

function checkIpFirewall(ip1, ip2){
    var rulesArr = []
    for(let i=0; i < vpnRules.length; i++){ //loop vpn firewall rules
        if(vpnRules[i].policy === 'deny'){
            let srcCiderArr = vpnRules[i].srcCidr.split(',');
            if(isIp4InCidrs(ip1, srcCiderArr)){ //Check src ip matches src subnet in vpn rules
                let destCiderArr = vpnRules[i].destCidr.split(',');
                if(isIp4InCidrs(ip2, destCiderArr)){ //Check dst ip matches dst subnet in vpn rules
                    let fireObj = vpnRules[i]
                    rulesArr.push(fireObj)
                }
            }
        }
    }
    if (rulesArr === undefined || rulesArr.length == 0){ 
    } else{
        return rulesArr
    }
}


