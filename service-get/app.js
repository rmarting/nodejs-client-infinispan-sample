const infinispan = require('@redhat/infinispan');
const express = require('express')
const os = require('os')
const app = express()
const port = 8080

app.get('/', (req, res) => {
    console.log("GET '/' Headers: " + JSON.stringify(req.headers));

    const connected = infinispan.client(
        { host: 'cache-services', port: 11222 },
        { clientIntelligence: 'BASIC', topologyUpdates: false, cacheName: 'call-context' });
    
    connected.then(function (client) {
        console.log('Connected to `call-context` cache. Getting data for request');
               
        // Retrieve the entry you added.
        var clientGet = client.get(req.get("data-key"));

        // Print the value of the entry
        var showGet = clientGet.then(
            function(value) { 
                console.log('Value from cache -> get(' + req.get("data-key") + ')=' + value);

                // Response
                res
                    .set('data-value', value)
                    .status(200)
                    .send(`Hello from Service Get! - ${os.hostname()}`);
            });
      
        // Disconnect from Infinispan Server
        return client.disconnect();
    }).catch(function(error) { 
        // Log any errors.
        console.log("Got error managing data in cache: " + error);
    });
})

app.listen(port, () => {
    console.log(`Service Get listening on port ${port}`)
})
