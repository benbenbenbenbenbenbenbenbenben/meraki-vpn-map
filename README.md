# Cisco Meraki - API VPN Map

Using Cisco Meraki and Google Maps API's, plot MX's on world map and draw lines between Spokes and Hubs to show VPN paths. Use the VPN Checker Tool for IP reachability across your VPNs. 

## Features

- [x] Nodejs server performs API calls and acts as web server.
- [x] Plot MX/Z devices with VPN enabled on Map
- [x] Show Offline/Online Devices
- [x] VPN paths between spokes and hubs
- [x] Device information on hover
- [x] VPN Checker Tool

## Demo
View live demo: <a href="https://vpn-map.herokuapp.com">https://vpn-map.herokuapp.com</a>.
<br>

<img src="https://www.kersnovske.com/meraki/images/vpn-map.png">

## Installation

Clone the source locally:

```sh
$ git clone https://github.com/benbenbenbenbenbenbenbenbenben/meraki-vpn-map.git
$ cd meraki-vpn-map
```

Install `npm` and `nodejs`:

```sh
$ sudo apt-get install npm nodejs
```

Install project dependencies:

```sh
$ npm install
```

Add your Meraki api key and your organization ID values to src/config-default.js. Rename to config.js

Add Google Maps api key to templates/views/index.hbs
https://maps.googleapis.com/maps/api/js?key=YOURKEYGOESHERE&callback=initMap&sensor=false&libraries=geometry,places&ext=.js


Start the nodejs server:

```sh
$ node src/app.js
```

Open web browser and go to:
<a href="http://localhost:3000/">http://localhost:3000/<a>

## VPN Checker Tool

Check source and destination IP Addresses for vpn reachability across your Meraki VPN estate.

### Usage

Enter source and destination IP addresses and select check connectivity to run 4 tests:

1) Check both IPs exist in a subnet
2) Check subnets are not on the same router
3) Check subnets are enabled for VPN
4) Check IPs are not blocked by VPN Firewall

If all checks pass VPN paths will highlight in green!

Otherwise user will be alerted on failed check.

#### Note

This tool only checks device/dashboard configuration and does not check if MX is online or VPN tunnel is up and passing traffic.

## API Flow

Get Org VPN firewall rules:
- add to new vpn rules array

Get DeviceStatuses:
- Returns list of all devices's, sort those with WAN1IP property

Get Device details:
- append lat, lng, address and model to MX array

Get Perf score for each online MX:
- append to MX array

Get VPN Details for each MX:
- append to MX array

## Dependencies

- Express
- Hbs
- Bottleneck
- Axios
- JSON-Bigint

## Built with
- [node-meraki-dashboard](https://github.com/tejashah88/node-meraki-dashboard)
- [IP Checker](https://tech.mybuilder.com/determining-if-an-ipv4-address-is-within-a-cidr-range-in-javascript/)
- [Curved Lines in Google Maps](https://stackoverflow.com/questions/34131378/how-to-make-a-dashed-curved-polyline-in-google-maps-js-api)
- [Bootstrap CSS](https://getbootstrap.com/)
- [Google Maps Javascript API](https://developers.google.com/maps/documentation/javascript/tutorial)

## License

MIT © Ben 2019
