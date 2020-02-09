module.exports = function(RED) {
    "use strict";
    function PxgridServerNode(n) {
        RED.nodes.createNode(this,n);

        var pxgrid = require('node-pxgrid');
        if (n.tls) {
            var tlsNode = RED.nodes.getNode(n.tls);
            var tlsOpts = {};
            var options = {debug:true};
            tlsNode.addTLSOptions(tlsOpts);
            if (tlsOpts.cert && tlsOpts.key && tlsOpts.ca && n.pxgridserver && n.clientname) {
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
        }

        var node = this;
        node.connected = false;
        node.connecting = false;
        this.users = {};

        this.connect = function (goToSubCallback) {
            if (!node.connected && !node.connecting) {
                node.connecting = true;
                this.pxgridClient.connect(options).then(session => {
                    this.stompSession = session;
                    node.connected = true;
                    node.connecting = false;
                    node.stompSession.onConnect = () => {
                        var allPxNodes = Object.values(node.users);
                        for (var onePxNode of allPxNodes) {
                            onePxNode.emit("connected");
                        }
                    };
                    node.stompSession.onWebSocketClose = () => {
                        var allPxNodes = Object.values(node.users);
                        for (var onePxNode of allPxNodes) {
                            onePxNode.emit("disconnected");
                        }
                    };
                    node.stompSession.onStompError = () => {
                        var allPxNodes = Object.values(node.users);
                        for (var onePxNode of allPxNodes) {
                            onePxNode.emit("disconnected");
                        }
                    };
                    goToSubCallback();
                });
            }
        }

        this.register = function(sessionNode) {
            node.users[sessionNode.id] = sessionNode;
            if (Object.keys(node.users).length === 1) {
                node.connect(() => {
                    var allPxNodes = Object.values(node.users);
                    for (var onePxNode of allPxNodes) {
                        onePxNode.emit("connected");
                    }
                });
            } else {
                sessionNode.emit("connected");
            }
        };

        this.deregister = function(sessionNode, done) {
            delete node.users[sessionNode.id];
            sessionNode.emit("disconnected");
            done();
        }

        this.subscribe = function(sessionNode, msgCallback) {
            if (sessionNode.type == "pxgrid-sessions") {
                node.pxgridClient.subscribeToSessions(node.stompSession, msgCallback);
            } else if (sessionNode.type == "pxgrid-radius-failures") {
                node.pxgridClient.subscribeToRadiusFailures(node.stompSession, msgCallback);
            }
        }

        this.on("close",function() {
            console.log("Cleaning up....");
            if (node.connected) {
                this.pxgridClient.disconnect(this.stompSession);
            }
            node.connecting = false;
            node.connected = false;
            this.pxgridClient = null;
            this.pxgridControl = null;
        });
    }
    RED.nodes.registerType("pxgridconf",PxgridServerNode);

    function PxgridSessionFeedNode(n) {
        RED.nodes.createNode(this,n);
        this.pxClient = RED.nodes.getNode(n.pxgridconf);
        var node = this;
            if (this.pxClient) {
                this.pxClient.register(node);
            }

        node.on("close", function() {
            if (this.pxClient) {
                this.pxClient.deregister(node);
            }
        });
        node.on("connected", function() {
            node.status({fill:"green",shape:"dot",text:"connected"});
            if (this.pxClient) {
                this.pxClient.subscribe(this, function(message) {
                      var newmsg={};
                      try {
                          newmsg.payload = JSON.parse(message.body);
                      }
                      catch(e) {
                          newmsg.payload = message.body;
                      }
                      node.send(newmsg);
                      console.log(message.body);
                  })
              }
      
        });
        node.on("disconnected", function() {
            node.status({fill:"grey",shape:"dot",text:"disconnected"});
        });
    }
    RED.nodes.registerType("pxgrid-sessions",PxgridSessionFeedNode);


    function PxgridRadiusFailuresNode(n) {
        RED.nodes.createNode(this,n);
        this.pxClient = RED.nodes.getNode(n.pxgridconf);
        var node = this;
            if (this.pxClient) {
                this.pxClient.register(node);
            }

        node.on("close", function() {
            if (this.pxClient) {
                this.pxClient.deregister(node);
            }
        });
        node.on("connected", function() {
            node.status({fill:"green",shape:"dot",text:"connected"});
            if (this.pxClient) {
                this.pxClient.subscribe(this, function(message) {
                      var newmsg={};
                      try {
                          newmsg.payload = JSON.parse(message.body);
                      }
                      catch(e) {
                          newmsg.payload = message.body;
                      }
                      node.send(newmsg);
                      console.log(message.body);
                  })
              }
      
        });
        node.on("disconnected", function() {
            node.status({fill:"grey",shape:"dot",text:"disconnected"});
        });
    }
    RED.nodes.registerType("pxgrid-radius-failures",PxgridRadiusFailuresNode);

    function PxgridRestNode(n) {
        RED.nodes.createNode(this,n);
        this.pxClient = RED.nodes.getNode(n.pxgridconf);
        this.call = n.call;
        var node = this;

            if (this.pxClient) {
                this.pxClient.register(node);
            }
        node.on("close", function() {
            if (this.pxClient) {
                this.pxClient.deregister(node);
            }
        });
        node.on("connected", function() {
            node.status({fill:"green",shape:"dot",text:"connected"});
        });
        node.on("input",function(msg,send,done) {
            if (msg.hasOwnProperty("payload")) {
                if (this.call == "getSessions") {
                    this.pxClient.pxgridClient.getSessions().then(sessions => {
                        var newmsg = {};
                        newmsg.payload= sessions;
                        node.send(newmsg);
                        done();
                    });
                } else if (this.call == "getRadiusFailures") {
                    this.pxClient.pxgridClient.getRadiusFailures().then(sessions => {
                        var newmsg = {};
                        newmsg.payload= sessions;
                        node.send(newmsg);
                        done();
                    });                    
                } else if (this.call == "getSystemHealth") {
                    this.pxClient.pxgridClient.getSystemHealth().then(sessions => {
                        var newmsg = {};
                        newmsg.payload= sessions;
                        node.send(newmsg);
                        done();
                    });                    
                } else if (this.call == "getSystemPerformance") {
                    this.pxClient.pxgridClient.getSystemPerformance().then(sessions => {
                        var newmsg = {};
                        newmsg.payload= sessions;
                        node.send(newmsg);
                        done();
                    });
                } else if (this.call == "getSxpBindings") {
                    this.pxClient.pxgridClient.getSxpBindings().then(sessions => {
                        var newmsg = {};
                        newmsg.payload= sessions;
                        node.send(newmsg);
                        done();
                    });
                }
            } else {
                done();
            }
        });
        node.on("disconnected", function() {
            node.status({fill:"grey",shape:"dot",text:"disconnected"});
        });
    }
    RED.nodes.registerType("pxgrid-rest",PxgridRestNode);
}