import React, { Component } from 'react';
import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    TouchableHighlight,
    NativeAppEventEmitter,
    NativeEventEmitter,
    NativeModules,
    Platform,
    PermissionsAndroid,
    ListView,
    ScrollView,
} from 'react-native';
import BleManager from 'react-native-ble-manager';

const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
const BleManageModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManageModule);

export default class App extends Component {
    constructor() {
        super()

        this.state = {
            scanning: false,
            peripherals: new Map()
        }

        this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
        this.handleStopScan = this.handleStopScan.bind(this);
        this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
        this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
    }

    componentDidMount() {
        BleManager.start({showAlert: false});

        this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
        this.handlerStop = bleManagerEmitter.addListener( 'BleManagerStopScan', this.handleStopScan );
        this.handlerDisconnect = bleManagerEmitter.addListener( 'BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
        this.handlerUpdate = bleManagerEmitter.addListener( 'BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic );

        if (Platform.OS === 'android' && Platform.Version >= 23) {
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result) {
                  console.log("Permission is OK");
                } else {
                  PermissionsAndroid.requestPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                    if (result) {
                      console.log("User accept");
                    } else {
                      console.log("User refuse");
                    }
                  });
                }
          });
        }
    }

    componentWillUnmount() {
        this.handlerDiscover.remove();
        this.handlerStop.remove();
        this.handlerDisconnect.remove();
        this.handlerUpdate.remove();
    }

    handleDisconnectedPeripheral(data) {
        let peripherals = this.state.peripherals;
        let peripheral = peripherals.get(data.peripheral);
        if (peripheral) {
          peripheral.connected = false;
          peripherals.set(peripheral.id, peripheral);
          this.setState({peripherals});
        }
        console.log('Disconnected from ' + data.peripheral);
    }
    
    handleUpdateValueForCharacteristic(data) {
        console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
    }
    
    handleStopScan() {
        console.log('Scan is stopped');
        this.setState({ scanning: false });
    }
    
    startScan() {
        if (!this.state.scanning) {
          BleManager.scan([], 3, true).then((results) => {
            console.log('Scanning...');
            this.setState({scanning:true});
          });
        }
    }
    
    handleDiscoverPeripheral(peripheral){
        var peripherals = this.state.peripherals;
        if (!peripherals.has(peripheral.id)){
          console.log('Got ble peripheral', peripheral);
          peripherals.set(peripheral.id, peripheral);
          this.setState({ peripherals })
        }
    }

    test(peripheral) {
        if (peripheral){
          if (peripheral.connected){
            BleManager.disconnect(peripheral.id);
          }else{
            BleManager.connect(peripheral.id).then(() => {
              let peripherals = this.state.peripherals;
              let p = peripherals.get(peripheral.id);
              if (p) {
                p.connected = true;
                peripherals.set(peripheral.id, p);
                this.setState({peripherals});
              }
              console.log('Connected to ' + peripheral.id);
            }
          }
        }
    }
    
    render() {
        const list = Array.from(this.state.peripherals.values());
        const dataSource = ds.cloneWithRows(list);
    
    
        return (
          <View style={styles.container}>
            <TouchableHighlight style={{marginTop: 40,margin: 20, padding:20, backgroundColor:'#ccc'}} onPress={() => this.startScan() }>
              <Text>Scan Bluetooth ({this.state.scanning ? 'on' : 'off'})</Text>
            </TouchableHighlight>
            <ScrollView style={styles.scroll}>
              {(list.length == 0) &&
                <View style={{flex:1, margin: 20}}>
                  <Text style={{textAlign: 'center'}}>No peripherals</Text>
                </View>
              }
              <ListView
                enableEmptySections={true}
                dataSource={dataSource}
                renderRow={(item) => {
                  const color = item.connected ? 'green' : '#fff';
                  return (
                    <TouchableHighlight onPress={() => this.test(item) }>
                      <View style={[styles.row, {backgroundColor: color}]}>
                        <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
                        <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 10}}>{item.id}</Text>
                      </View>
                    </TouchableHighlight>
                  );
                }}
              />
            </ScrollView>
          </View>
        );
    }
}

    
const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: '#FFF',
    width: window.width,
    height: window.height
    },
    scroll: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    margin: 10,
    },
    row: {
      margin: 10
    },
});
