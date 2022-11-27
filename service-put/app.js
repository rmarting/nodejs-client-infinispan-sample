const infinispan = require('infinispan');
const crypto = require('crypto');
const axios = require('axios').default;
const express = require('express')
const app = express()
const port = 8080

// REST API

app.get('*', function(req, res) {
    handleAccessControl(req, res);
});
app.post('*', function(req, res) {
    handleAccessControl(req, res);
});
app.put('*', function(req, res) {
    handleAccessControl(req, res);
});
app.delete('*', function(req, res) {
    handleAccessControl(req, res);
});

app.listen(port, () => {
    console.log(`Service Put listening on port ${port}`)
})

function handleAccessControl(req, res) { 
    console.log(`Called using path: ${req.url}`);
    console.log("Headers:");
    console.log(JSON.stringify(req.headers));

    const connected = infinispan.client(
        { host: 'cache-services', port: 11222 },
        {
            clientIntelligence: 'BASIC',
            topologyUpdates: false,
            cacheName: 'call-context'
        });
    
    connected.then(function (client) {
        console.log('Connected to `call-context` cache. Putting value for request');

        var key = crypto.randomUUID();
        var value = crypto.randomUUID();
                
        // Add an entry to the cache.
        var clientPut = client.put(key, value);

        console.log("Added value " + value + " in cache for key " + key);

        // Request to second service
        axios.get(`http://service-get:8080/`, { headers: { 'data-key': key }})
            .then(response => {
                console.log("Response Headers: " + JSON.stringify(response.headers));

                console.log("Comparing '" + response.headers["data-value"] + "' and '" + value + "'");

                if (response.headers["data-value"] == value) {
                    res.status(200).send(`Key processing successful: ${response.data}`);
                } else {
                    res.status(422).send(`Key processing failed: ${response.data}`); // Unprocessable Entity
                }
            })
            .catch(error => {
                console.log(error);
                res.status(500).send("Something went wrong! - " + error);
            })
        
        // Disconnect from Infinispan Server.
        return client.disconnect();
    }).catch(function(error) { 
        // Log any errors.
        console.log("Got error managing data in cache: " + error);
    });
}
