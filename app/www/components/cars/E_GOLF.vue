<template></template>
<script>
    import eventBus from './../modules/event.vue';
    import helper from './../modules/helper.vue';
    import storage from './../modules/storage.vue';

    export default {
        data() {
            return {
                initCMD: [
                    'ATD', 'ATZ', 'ATE0', 'ATL0', 'ATSP7', 'ATBI', 'ATSH FC007B', 'ATCP 17', 'ATCAF0', 'ATCF 17FE7', 'ATCRA17FE007B'
                ],
                offset: 0,
                inStandbyMode: false,
                emptyResponses: 0,
                currentCommand: 0,
                commands: [
                    //ELECTRIC_VOLTAGE
                    '03221e3b55555555',
                    //ELECTRIC_CURRENT
                    '03221e3d55555555',
                    '0322028C55555555',
                    '0322744855555555',
                    '0322189d55555555',
                    //MIN_TEMP
                    '03221e0f55555555',
                    //MAX_TEMP
                    '03221e0e55555555'
                ]
            };
        },
        methods: {
            init() {
                var self = this;

                // listener to wakeup after standby mode
                eventBus.$off('wakeup');
                eventBus.$on('wakeup', () => self.inStandbyMode = false);

                // unsubscribe from prior existing listener
                bluetoothSerial.unsubscribe();

                // subscribe to data
                bluetoothSerial.subscribe('>', data => {
                    if (self.inStandbyMode) return;
                    // remove spaces
                    data = data.trim().replace(/\s/g, '');
                    console.log({
                        data
                    });
                    // send debug data to backend if debug mode enabled
                    if (DEBUG) Vue.http.post(RESTURL + 'debug', {
                        data: self.commands[self.currentCommand] + ': ' + data,
                        akey: storage.getValue('akey')
                    });

                    if (self.offset + 1 === self.initCMD.length) {
                        // init of dongle finished, parse data and just send the OBD2 command
                        eventBus.$emit('obd2Data', self.parseData(data));
                        setTimeout(() => {
                            bluetoothSerial.write(self.commands[self.currentCommand] + '\r');
                        }, 500);
                    } else bluetoothSerial.write(self.initCMD[++self.offset] + '\r');
                }, err => console.error(err));

                // initialize the dongle by sending the first command
                bluetoothSerial.write(self.initCMD[self.offset] + '\r');
            },
            parseData(data) {
                var self = this,
                    parsedData = {},
                    baseData = self.getBaseData();

                try {
                    data = data.replace(self.commands[self.currentCommand], '');

                    if (self.currentCommand === 0) {
                        const firstDataByte = parseInt(data.slice(8, 10), 16); // fifth byte
                        const secondDataByte = parseInt(data.slice(10, 12), 16); // sixth byte

                        parsedData = {
                            DC_BATTERY_VOLTAGE: (firstDataByte * Math.pow(2, 8) + secondDataByte) / 4
                        };
                    } else if (self.currentCommand === 1) {
                        const firstDataByte = parseInt(data.slice(8, 10), 16); // fifth byte
                        const secondDataByte = parseInt(data.slice(10, 12), 16); // sixth byte
                        const thirdDataByte = parseInt(data.slice(12, 14), 16); // seventh byte
                        const fourthDataByte = parseInt(data.slice(14, 16), 16); // eigth byte

                        parsedData = {
                            DC_BATTERY_CURRENT: ((firstDataByte * Math.pow(2, 8) + secondDataByte - 2048) / 4) * -1
                        };
                    } else if (self.currentCommand === 2) {
                        const socBMS = parseInt(data.slice(8,10), 16) / 2.5; // fifth byte

                        parsedData = {
                            SOC_BMS: socBMS,
                            SOC_DISPLAY: (socBMS * 51 / 46 - 6.4).toFixed(1)
                        };
                    } else if (self.currentCommand === 3) {
                        const mode = parseInt(data.slice(8,10), 16); // fifth byte

                        parsedData = {
                            CHARGING: mode === 4 || mode === 6 ? 1 : 0,
                            NORMAL_CHARGE_PORT: mode === 4 ? 1 : 0,
                            RAPID_CHARGE_PORT: mode === 6 ? 1 : 0
                        };
                    } else if (self.currentCommand === 4) {
                        const firstDataByte = helper.parseSigned(data.slice(12,14)); // seventh byte
                        const secondDataByte = Math.abs(helper.parseSigned(data.slice(14,16))); // eigth byte

                        parsedData = {
                            BATTERY_INLET_TEMPERATURE: (firstDataByte * Math.pow(2, 8) + secondDataByte) / 64
                        };
                    } else if (self.currentCommand === 5) {
                        const firstDataByte = helper.parseSigned(data.slice(8,10)); // fifth byte
                        const secondDataByte = Math.abs(helper.parseSigned(data.slice(10,12))); // sixth byte

                        parsedData = {
                            BATTERY_MIN_TEMPERATURE: (firstDataByte * Math.pow(2, 8) + secondDataByte) / 64
                        };
                    } else if (self.currentCommand === 6) {
                        const firstDataByte = helper.parseSigned(data.slice(8,10)); // fifth byte
                        const secondDataByte = Math.abs(helper.parseSigned(data.slice(10,12))); // sixth byte

                        parsedData = {
                            BATTERY_MAX_TEMPERATURE: (firstDataByte * Math.pow(2, 8) + secondDataByte) / 64
                        };
                    }
                } catch (err) {
                    console.error(err);
                }

                // extend with base data
                Object.keys(baseData).forEach(key => parsedData[key] = baseData[key]);
                console.log({
                    parsedData
                });
                
                if (self.currentCommand + 1 === self.commands.length) self.currentCommand = 0;
                else self.currentCommand++;

                return parsedData;
            },
            getBaseData() {
                return {
                    CAPACITY: 36,
                    SLOW_SPEED: 2.3,
                    NORMAL_SPEED: 7.4,
                    FAST_SPEED: 40
                };
            },
            standbyMode() {
                var self = this;

                self.inStandbyMode = true;
                // unsubscribe, and emit low power mode command
                bluetoothSerial.unsubscribe();
                bluetoothSerial.write('ATLP\r', () => {
                    eventBus.$emit('standby');
                }, err => eventBus.$emit('standby', err));
            }
        }
    }
</script>
