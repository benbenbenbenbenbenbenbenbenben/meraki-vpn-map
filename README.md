# Cisco Meraki - API VPN Map

Using Cisco Meraki and Google Maps API's, plot MX's on world map and draw lines between Spokes and Hubs to show VPN paths. Use the VPN Checker Tool for IP reachability across your VPNs.

## Features

- [x] Plot MX/Z devices with VPN enabled on Map
- [x] Show Offline/Online Devices
- [x] VPN paths between spokes and hubs
- [x] Device information on hover
- [x] VPN Checker Tool

## Demo
View live demo: <a href="kersnovske.com/">kersnovske.com</a>.
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
Start the app:

```sh
$ node src/app.js
```
   
## Usage

1) Add your Meraki apiKey and your orgID values to src/app.js

2) Add Google Maps api key to templates/views/index.hbs
https://maps.googleapis.com/maps/api/js?key=YOURKEYGOESHERE&callback=initMap&sensor=false&libraries=geometry,places&ext=.js

3) Start/Restart the app:

```sh
$ node src/app.js
```
   or if using nodemon:

```sh
$ nodemon src/app.js
```

4) Open web browser and go to:
<a href="http://localhost:3000/">http://localhost:3000/<a>

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

- Path
- Express
- Hbs
- Bottleneck

## Built with
- [node-meraki-dashboard](https://github.com/tejashah88/node-meraki-dashboard)
- [IP Checker](https://tech.mybuilder.com/determining-if-an-ipv4-address-is-within-a-cidr-range-in-javascript/)
- [Curved Lines in Google Maps](https://stackoverflow.com/questions/34131378/how-to-make-a-dashed-curved-polyline-in-google-maps-js-api)
- [Bootstrap CSS](https://getbootstrap.com/)
- [Google Maps Javascript API](https://developers.google.com/maps/documentation/javascript/tutorial)

## License

MIT  © 
