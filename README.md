# Cisco Meraki API VPN Map

Using Cisco Meraki and Google Maps API's, plot MX's on world map and draw lines between Spokes and Hubs to show VPN paths. 

## Features

- [x] Plot MX/Z devices with VPN enabled on Map
- [x] Show Offline/Online Devices
- [x] VPN paths between spokes and hubs
- [x] Device information on hover
- [x] VPN Checker Tool

# Demo
View demo <a href="kersnovske.com/">kersnovske.com</a>.
<br>

<img src="gif">

## Installation


### For developers
Clone the source locally:

```sh
$ git clone https://github.com/benbenbenbenbenbenbenbenbenben/meraki-vpn-map.git
$ cd meraki-vpn-map
```

Use your package manager to install `npm`.

```sh
$ sudo apt-get install npm nodejs
```

Install project dependencies:

```sh
$ npm install
```
Start the app:

```sh
$ npm start
```



## Files

### Main 
- app.js

## Dependencies

- Path
- Express
- Hbs
- Bottleneck
   
## Usage

Add your Meraki apiKey and your orgID values to src/app.js
Add Google Maps api key to templates/views/index.hbs
https://maps.googleapis.com/maps/api/js?key=YOURKEYGOESHERE&callback=initMap&sensor=false&libraries=geometry,places&ext=.js

<kbd>Command/ctrl + R</kbd> - Reload

<kbd>command + q</kbd> - Quit App (while window is open).


// API Flow
//Get DeviceStatuses
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

## Built with
- [node-meraki-dashboard](https://github.com/tejashah88/node-meraki-dashboard)
- [IP Checker](https://tech.mybuilder.com/determining-if-an-ipv4-address-is-within-a-cidr-range-in-javascript/)
- [Curved Lines in Google Maps](https://stackoverflow.com/questions/34131378/how-to-make-a-dashed-curved-polyline-in-google-maps-js-api

## 


## License

MIT  © 
