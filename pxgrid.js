module.exports = function(RED) {
    "use strict";
    function PxgridServerNode(n) {
        RED.nodes.createNode(this,n);
        var pxgrid = require('node-pxgrid');
        var tlsNode = RED.nodes.getNode(n.tls);
        var tlsOpts = {};
        tlsNode.addTLSOptions(tlsOpts);
        this.pxgridControlOptions = {
            host: n.pxgridserver,
            client: n.clientname,
            clientCert: tlsOpts.cert,
            clientKey: tlsOpts.key,
            caBundle: tlsOpts.ca,
            clientKeyPassword: tlsOpts.passphrase
        }
        this.pxgridControl = new pxgrid.Control(this.pxgridControlOptions);
        this.pxgridClient = new pxgrid.Client(this.pxgridControl);
    }
    RED.nodes.registerType("pxgridconf",PxgridServerNode);

    function PxgridSessionFeedNode(n) {
        RED.nodes.createNode(this,n);
        var pxClient = RED.nodes.getNode(n.pxgridconf);
        var node = this;
        var options = {debug:true};
        pxClient.pxgridClient.connect(options).then(session =>
            pxClient.pxgridClient.subscribeToSessions(session, function(message) {
                node.status({fill:"green",shape:"dot",text:"connected"});
                var newmsg={}
                try {
                    newmsg.payload = JSON.parse(message.body);
                }
                catch(e) {
                    newmsg.payload = message.body;
                }
                node.send(newmsg);
                console.log(message.body);
            })).catch( err => console.log(err))
/*
        node.client.on("connect", function() {
            node.status({fill:"green",shape:"dot",text:"connected"});
        });

        node.client.on("reconnecting", function() {
            node.status({fill:"red",shape:"ring",text:"reconnecting"});
            node.warn("reconnecting");
        });

        node.client.on("error", function(error) {
            node.status({fill:"grey",shape:"dot",text:"error"});
            node.warn(error);
        });
*/
        node.status({fill:"grey",shape:"ring",text:"connecting"});
/*
        node.client.connect(function(sessionId) {
            node.log('subscribing to: '+node.topic);
            node.client.subscribe(node.topic, function(body, headers) {
                var newmsg={"headers":headers,"topic":node.topic}
                try {
                    newmsg.payload = JSON.parse(body);
                }
                catch(e) {
                    newmsg.payload = body;
                }
                node.send(newmsg);
            });
        }, function(error) {
            node.status({fill:"grey",shape:"dot",text:"error"});
            node.warn(error);
        });
*/
        node.on("close", function(done) {
 /*           if (node.client) {
                // disconnect can accept a callback - but it is not always called.
                node.client.disconnect();
            } */
            done();
        });
    }
    RED.nodes.registerType("pxgrid-sessions",PxgridSessionFeedNode);


    function PxgridRadiusFailuresNode(n) {
        RED.nodes.createNode(this,n);
        var node = this;
        pxgridClient.connect().then(session =>
            pxgridClient.subscribeToRadiusFailures(session, function(message) {
                node.status({fill:"green",shape:"dot",text:"connected"});
                var newmsg={"headers":headers,"topic":node.topic}
                try {
                    newmsg.payload = JSON.parse(message.body);
                }
                catch(e) {
                    newmsg.payload = message.body;
                }
                node.send(newmsg);
                console.log(message.body);
            })).catch( err => console.log(err))

        node.status({fill:"grey",shape:"ring",text:"connecting"});

        node.on("close", function(done) {
             done();
        });
    }
    RED.nodes.registerType("pxgrid-radius-failures",PxgridSessionFeedNode);
}