// mDNS Server to advertise beehive.local
const mdns = require('mdns');

try {
  const ad = mdns.createAdvertisement(mdns.tcp('http'), 5173, {
    name: 'BEEHIVE Restaurant',
    txtRecord: {
      path: '/'
    }
  });
  
  ad.start();
  console.log('📡 mDNS advertising: http://beehive.local:5173');
} catch (error) {
  console.log('⚠️  mDNS not available:', error.message);
  console.log('💡 Users can still access via IP: http://192.168.1.10:5173');
}
