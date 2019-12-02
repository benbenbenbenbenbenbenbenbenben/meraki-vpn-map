'use strict';
//Based off tejashah88 github of Meraki Nodjs library
//https://github.com/tejashah88/node-meraki-dashboard
//
const axios = require('axios');
const ERRORS = { INVALID_API_KEY: 'Invalid API Key specified!' };

function MerakiDashboard(apiKey) {
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0)
    throw new Error(ERRORS.INVALID_API_KEY)

  apiKey = apiKey.trim()

  const dashboard = {}

  //Process Successful API Call
  const dataProcessor = response => {
    if(response.status !== 200){
      return response.status;
    } else {
      console.log(response.config.method, response.config.url)
      return response.data;
    }
  }
  //Process Failed API Call, Error logged to console
  const errorProcessor =  async (error) => {
    if (error.config && error.response && error.response.status === 4299) {
        // console.log(error)
         await sleep(error.response.headers["Retry-After"])
        console.log(2)
        return rest.client.get(error.config.url)
    } else {
      console.log('\x1b[31m', error.response.config.method, error.response.config.url, error.response.status, error.response.statusText)
      delete error.response.request
      return Promise.reject(error.response)
    }
  };

  const rest = {
    client: axios.create({
      baseURL: 'https://api.meraki.com/api/v0/',
      headers: {
        'X-Cisco-Meraki-API-Key': apiKey,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      }
    }),
    get: function(url, params) {
      return this.client.get(url, { params })
        .then(dataProcessor)
        .catch(errorProcessor);
    }   
  };

  // // Add a response interceptor
  // rest.client.interceptors.response.use(function (response) {
  //   // Any status code that lie within the range of 2xx cause this function to trigger
  //   // Do something with response data
  //   return response;
  // }, async function (error) {
  //   // Any status codes that falls outside the range of 2xx cause this function to trigger
  //   // Do something with response error
  //   console.log('interceptor')
  //   if (error.config && error.response && error.response.status === 429) {
  //       console.log(1)
  //       await sleep(error.headers["Retry-After"])
  //       console.log(2)
  //       return rest.client.get(error.config)
  //   }
  //   return Promise.reject(error);
  // })

  //429 Sleep Timeout
  function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}
  
  //API ENDPOINTS:
  dashboard.api_usage = {
    api_requests: (organization_id, params) => rest.get(`/organizations/${organization_id}/apiRequests`, params)
  };

  dashboard.devices = {
    get: (network_id, serial) => rest.get(`/networks/${network_id}/devices/${serial}`),
    performanceScore: (network_id, serial) => rest.get(`/networks/${network_id}/devices/${serial}/performance`)
  };

  dashboard.networks = {
    getSiteToSiteVpn: (network_id) => rest.get(`/networks/${network_id}/siteToSiteVpn`),
    getWarmSpare: (network_id) => rest.get(`/networks/${network_id}/warmSpareSettings`),
  };

  dashboard.organizations = {
    list: () => rest.get(`/organizations`),
    getDeviceStatuses: (organization_id) => rest.get(`/organizations/${organization_id}/deviceStatuses`),
    getThirdPartyVpnPeers: (organization_id) => rest.get(`/organizations/${organization_id}/thirdPartyVPNPeers`),
    getRules: (organization_id) => rest.get(`/organizations/${organization_id}/vpnFirewallRules`),
  };

  return dashboard;
}

module.exports = MerakiDashboard;