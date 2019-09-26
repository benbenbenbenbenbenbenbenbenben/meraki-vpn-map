//Store Array of MX's
var mxList = []
//Store Array of VPN Rules
var vpnRules = []

//Fetch MX and VPN array from server
function fetchMXs(callback){
    progress('Fetching MX Details from server') 
    fetch('/mxs').then(response => {
            if(response.ok){
                response.json()
                .then(data => {
                    console.log('fetched from server')
                    mxList = data[0]
                    vpnRules = data[1]
                    callback(mxList);
                })
            }
    })
}

function progress(status){
    document.getElementById('loadStatus').innerHTML = status
}

//Swap betteen main view and checker tool
function toggleView() {
    main.classList.toggle("hide-loader")
    main.classList.toggle("d-flex")
    editor.classList.toggle("hide-loader")
    editor.classList.toggle("d-flex")
}
