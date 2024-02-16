const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
/**
 *
 * Node Red node type: tuya config
 *
 */
module.exports = (RED) => {
  function TuyaConfigNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.baseurl = config.baseurl;
    node.accesskey = config.accesskey;
    node.secretkey = config.secretkey;
    node.deviceid = config.deviceid;

    const api = new TuyaContext({
      baseUrl: node.baseurl,
      accessKey: node.accesskey,
      secretKey: node.secretkey,
    });
    (async () => {
      const devinfo = await api.request({ method: 'GET', path: `/v1.0/devices/${node.deviceid}` });
      if (devinfo.result === undefined) {
        console.log(new Date(),'tuya config','no devinfo result',JSON.stringify(devinfo));
        return;
      }
      const userid = devinfo.result.uid;
      if (userid === undefined) {
        console.log(new Date(),'tuya config','no userid',JSON.stringify(devinfo.result));
        return;
      }
      // Fetch application devices from Tuya cloud
      const result = await api.request({ method: 'GET', path: `/v1.0/users/${userid}/devices` });

      const devices = {};
      for (let i = 0; i < result.result.length; i += 1) {
        const appData = result.result[i];
        const data = {
          devicekey: appData.local_key,
          devicename: appData.name,
        };
        devices[appData.id] = data;
      }

      node.devices = devices;
      console.log('Devices',JSON.stringify(devices,null,'\t'));
    })();

    RED.httpAdmin.get('/tuyadevices/:id', (req, res) => {
      const confignode = RED.nodes.getNode(req.params.id);
      if (node != null) {
        try {
          res.set('Content-Type', 'application/json');
          res.send(JSON.stringify(confignode.devices)).end();
        } catch (err) {
          res.sendStatus(500);
          node.error(`Failed:${err}`);
        }
      } else {
        res.sendStatus(404);
      }
    });
  }

  RED.nodes.registerType('tuya config', TuyaConfigNode);
};
