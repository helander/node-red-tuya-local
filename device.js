const TuyAPI = require('tuyapi');
/**
 *
 * Node Red node type: tuya device
 *
 */
module.exports = (RED) => {
  function TuyaDeviceNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.account = RED.nodes.getNode(config.account);
    node.deviceid = config.deviceid;
    node.devicekey = config.devicekey;
    node.devicename = config.devicename;
    this.queue = [];
    node.status({ fill: 'grey', shape: 'ring' });
    this.device = new TuyAPI({ id: node.deviceid, key: node.devicekey });

    this.device.find({timeout: 30}).then(() => {
      node.status({ fill: 'grey', shape: 'dot' });
      node.send([null, {payload: 'found'} ])
      this.device.connect();
      console.log(new Date(),this.devicename,'found');
    });

    this.device.on('connected', () => {
      node.status({ fill: 'yellow', shape: 'dot' });
      node.send([null, {payload: 'connected'} ])
      console.log(new Date(),this.devicename,'connected');
    });

    this.device.on('disconnected', () => {
      node.status({ fill: 'yellow', shape: 'ring' });
      node.send([null, {payload: 'disconnected'} ])
      console.log(new Date(),this.devicename,'disconnected');
    });

    //this.device.on('dp-refresh', data => {
    //  node.status({ fill: 'blue', shape: 'ring' });
    //  node.send([null, {payload: 'dp-refresh'} ])
    //  console.log(new Date(),this.devicename,'dp-refresh',data);
    //});

    this.device.on('error', error => {
      node.status({ fill: 'red', shape: 'dot', text: error });
      node.send([null, {payload: 'error'} ])
    });

    this.device.on('data', data => {
      const firstIndex = Object.keys(data.dps)[0];
      node.status({ fill: 'green', shape: 'ring', text: `dpIdx=${firstIndex}` });
      node.send([{payload: data.dps}, null])
      //console.log(new Date(),this.devicename,'data',data);
    });

    async function inputHandler(self) {
      //console.log(new Date(),'inputHandler entry',self.devicename);
      try {
        const data = self.queue[0];
        //console.log(new Date(), 'set',self.devicename,data);
        await self.device.set({multiple: true, data: data});
        const getData = await self.device.get({schema: true});
        const firstIndex = Object.keys(getData.dps)[0];
        node.status({ fill: 'green', shape: 'dot', text: `dpIdx=${firstIndex}` });
        //console.log(new Date(), 'after set',self.devicename,data);
        self.queue.shift();
        if (self.queue.length > 0) inputHandler(self);
      } catch (err) {
        node.log(`error  ${err}`);
        node.status({ fill: 'red', shape: 'dot', text: err });
      }
      //console.log(new Date(),'inputHandler exit',self.devicename);
    }

    /**
     *
     * The node's input message handler
     *
     */
    this.on('input', (msg) => {
      //console.log(new Date(),'onInput entry',this.devicename);
      this.queue.push(msg.payload);
      if (this.queue.length === 1) inputHandler(this);
      //console.log(new Date(),'onInput exit',this.devicename);
      return undefined;
    });

    this.on('close', () => {
      this.device.disconnect();
    });
  }

  RED.nodes.registerType('tuya device', TuyaDeviceNode);
};
