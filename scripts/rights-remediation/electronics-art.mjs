// Original concept diagrams, CC0 1.0. These are not board photographs or pinouts.
import {writeFile,mkdir} from 'node:fs/promises';
const out=new URL('../../assets/images/lessons/electronics-reference/',import.meta.url);
await mkdir(out,{recursive:true});
const specs=[
 ['accelerationgyroscope.jpg','Acceleration and rotation','Motion','Measured change','axes'],
 ['ACTIVEBUZZER.jpeg','Active buzzer','DC power','Built-in tone','speaker'],
 ['AvoidanceModule.jpg','Infrared obstacle sensor','Reflected IR','Detection signal','beam'],
 ['BIGSOUNDANDSMALLSOUNDMODULE.jpg','Sound sensor','Air vibration','Microphone signal','sound'],
 ['BreadboardSUpplyModule.jpg','Breadboard power module','Supply input','Regulated output','power'],
 ['buttoncomponent.jpg','Push button','Press','Switch closes','switch'],
 ['BUTTON.jpg','Button module','Press','Logic signal','switch'],
 ['ceramiccapacitor.jpg','Ceramic capacitor','Voltage across plates','Stored charge','capacitor'],
 ['digitaltempmodule.jpg','Temperature module','Temperature','Electrical signal','thermometer'],
 ['Diodes.jpg','Diode','Forward bias','One-way conduction','diode'],
 ['DS1307MODULE.jpg','Real-time clock','Oscillator + backup','Clock data','clock'],
 ['electrolyriccapacitor.jpg','Electrolytic capacitor','Correct polarity','Stored charge','capacitor'],
 ['flamesensormodule.jpeg','Flame sensor','Infrared light','Detection signal','beam'],
 ['HOWTOSOLDER.jpeg','Making a solder joint','Heat pad and lead','Feed solder to joint','solder'],
 ['IREMISSION.jpg','Infrared emitter','Electrical drive','Infrared light','led'],
 ['IRRECIEVER.jpeg','Infrared receiver','Infrared signal','Received data','beam'],
 ['JOYSTICKMODULE.jpeg','Joystick module','Handle position','Two axis values','axes'],
 ['LASERTRANSMITTORDIODE.jpg','Laser module','Electrical drive','Narrow light beam','beam'],
 ['LCDMODULE.jpg','Character LCD','Controller data','Displayed characters','display'],
 ['LED7ColorFlash.jpg','Color-cycling LED','Power','Changing light','led'],
 ['LED.jpg','Light-emitting diode','Forward current','Visible light','led'],
 ['linearhallmodule.jpg','Hall sensor','Magnetic field','Electrical signal','magnet'],
 ['MEMBRANESWITCH.jpeg','Membrane keypad','Key press','Row / column contact','keypad'],
 ['METALTOUCH.jpg','Touch sensor','Touch interaction','Detection signal','touch'],
 ['OHMSLAW.jpg','Ohm’s law','Voltage V','V = I × R','resistor'],
 ['OhmTriangleTransposed.png','Ohm’s law relationships','V = I × R','I = V / R','resistor'],
 ['PASSIVEBUZZER.jpg','Passive buzzer','Oscillating drive','Sound at drive rate','speaker'],
 ['photo-interruptermodule.jpg','Photo-interrupter','Object in slot','Beam interrupted','slot'],
 ['photoresistor.jpg','Photoresistor','Light level','Changing resistance','resistor'],
 ['photoresistormodule.jpg','Light sensor module','Light level','Electrical signal','beam'],
 ['PIRsensor.png','PIR motion sensor','Changing infrared','Motion indication','dome'],
 ['RELAYMODULE.jpg','Relay module','Coil drive','Separate switched circuit','relay'],
 ['ROTARYENCODER.jpg','Rotary encoder','Shaft rotation','Pulses / direction','dial'],
 ['SHAKEMODULE.jpg','Vibration switch','Movement','Contact change','switch'],
 ['SMDRGBMODULE.jpg','Surface-mount RGB LED','Three color channels','Mixed light','led'],
 ['solderingARMS.jpg','Helping hands','Hold work securely','Keep hands clear','clamp'],
 ['solderingCLEANING.jpg','Tip cleaner','Hot iron tip','Remove surface residue','clean'],
 ['solderingFUMEextractor.jpg','Fume extraction','Fumes at the joint','Capture near source','fan'],
 ['solderingiron.jpg','Soldering iron','Controlled heating','Heat pad and lead','iron'],
 ['solderingWIRE.jpg','Solder wire','Solder alloy + flux','Wets the heated joint','spool'],
 ['TAPMODULE.jpg','Tap sensor','Mechanical tap','Contact change','switch'],
 ['tempandhumiditymodule.jpg','Temperature and humidity','Ambient conditions','Sensor data','thermometer'],
 ['tempsensor18b20.png','Digital temperature sensor','Temperature','Digital reading','thermometer'],
 ['TILTSWITCHMODULE.jpg','Tilt switch','Orientation','Contact change','switch'],
 ['transistor.jpg','Transistor','Small control signal','Controls larger current','transistor'],
 ['TWOCOLORLEDMODULE.jpg','Two-color LED','Two color channels','Selectable light','led'],
 ['ultrasonicsensor.png','Ultrasonic distance sensor','Send a sound pulse','Time the returning echo','ultrasound'],
 ['VoltageCurrentResistanceRelationship.jpg','Voltage, current, resistance','V = I × R','R = V / I','resistor'],
 ['watersensormodule.png','Water sensing board','Water on traces','Conductivity change','water'],
 ['RBG LED module.jpg','RGB LED module','Red + green + blue','Additive color mixing','led']
];
const icons={
 axes:'<path d="M335 235v-100m0 100h120m-120 0-55 65m55-165-9 18m9-18 9 18m111 82 20 18-20 9"/><text x="465" y="240">x</text><text x="328" y="122">y</text><text x="261" y="321">z</text>',
 speaker:'<path d="m290 205 38-1 37-35v112l-37-35h-38Z"/><path d="M389 196q40 30 0 60m25-84q70 55 0 111"/>',
 sound:'<rect x="322" y="147" width="61" height="115" rx="30"/><path d="M303 215v19q0 54 50 54t50-54v-19m-50 73v34m-33 0h66"/><path d="m280 175-23 13m25 19h-30m165-32 23 13m-25 19h30"/>',
 power:'<rect x="275" y="162" width="170" height="116" rx="12"/><path d="M245 215h30m170 0h35m-170-28h25m-12-12v25m65 54h26"/><text x="306" y="238">DC</text>',
 switch:'<path d="M255 249h55m0 0 97-57m0 57h65"/><circle cx="310" cy="249" r="7"/><circle cx="407" cy="249" r="7"/><path d="M360 127v45m-12-14 12 14 12-14"/>',
 capacitor:'<path d="M250 221h85m0-60v120m35-120v120m0-60h95"/><path d="M299 170h20m-10-10v20"/>',
 diode:'<path d="M250 222h65m0-45 65 45-65 45Zm65-45h80m-80-44v88"/>',
 clock:'<circle cx="357" cy="222" r="80"/><path d="M357 162v60l42 26"/><path d="M357 147v10m70 65h-10m-60 70v-10m-70-60h10"/>',
 thermometer:'<path d="M341 255V155a16 16 0 0 1 32 0v100a33 33 0 1 1-32 0Z"/><path d="M357 180v92m39-103h25m-25 30h15m-15 30h25"/>',
 beam:'<path d="M270 202v68h58v-68Zm58 14h20m-20 26h20m44-20 66-35m-66 35h70m-70 0 66 35"/><path d="M360 213v18"/>',
 led:'<path d="M274 241h40m0-42 61 42-61 42Zm61 0h75m-75-42v84m-9-80 32-31m-15 1h15v15m4 29 32-31m-15 1h15v15"/>',
 magnet:'<path d="M290 163v84a65 65 0 0 0 130 0v-84h-35v84a30 30 0 0 1-60 0v-84Z"/><path d="M290 193h35m60 0h35"/><text x="292" y="150">N</text><text x="390" y="150">S</text>',
 keypad:'<rect x="296" y="134" width="124" height="180" rx="14"/>'+Array.from({length:12},(_,i)=>`<rect x="${311+i%3*32}" y="${151+Math.floor(i/3)*39}" width="22" height="26" rx="3"/>`).join(''),
 touch:'<path d="M314 286v-63q0-15 15-7v-53q0-19 17-13v68-28q0-17 17-10v39-21q0-17 17-8v29-12q0-15 17-6v63q0 35-34 35h-22q-27-2-27-23Z"/><path d="M300 173q-35-35-5-65m64 1q35 29 15 54"/>',
 resistor:'<path d="M246 224h44l14-26 24 52 24-52 24 52 24-52 14 26h48"/>',
 slot:'<path d="M285 150v141h140V150h-42v90h-56v-90Z"/><path d="M327 205h56m-27-74v60m-9-13 9 13 9-13"/>',
 dome:'<path d="M277 250a80 80 0 0 1 160 0Zm0 0v39h160v-39M357 170v80m-41-68q-24 37-9 68m89-68q24 37 9 68m-115-39h137"/>',
 relay:'<path d="M252 183h29q14-27 27 0 14-27 27 0 14-27 27 0h20m-126 91h48l72-42m0 42h88"/><path d="M310 210h70" stroke-dasharray="6 8"/>',
 dial:'<circle cx="357" cy="224" r="74"/><path d="M357 224l39-44m-18-46q51 14 65 60m-17-9 17 9 4-22"/>',
 display:'<rect x="252" y="166" width="217" height="125" rx="10"/><rect x="272" y="187" width="177" height="78" rx="3"/><text x="289" y="238">HELLO</text>',
 transistor:'<circle cx="357" cy="223" r="73"/><path d="M252 223h71m0-47v95m0-59 90-52m-90 75 90 52m-20-37 20 37-42-3"/>',
 ultrasound:'<rect x="246" y="196" width="225" height="96" rx="14"/><circle cx="299" cy="243" r="36"/><circle cx="416" cy="243" r="36"/><path d="M300 169q57-59 114 0m-101-20q44-47 89 0m-70-20q26-26 51 0"/>',
 water:'<path d="M354 129q-60 76-60 109a61 61 0 0 0 122 0q0-35-62-109Z"/><path d="M321 251q4 24 31 24m87-89v94m18-94v94"/>',
 iron:'<path d="m252 272 26-28 47-24 30 16-50 24Zm74-54 76-52 35 28-82 51"/><path d="M426 176q16-47 44-25m-126 93q-17 23-39 37"/>',
 solder:'<path d="M249 285h215m-95 0v-91m-32 91q32-30 64 0M279 197l42 30 34 39m-68-80 43 30m111 20-45 35"/><text x="267" y="169">HEAT</text>',
 spool:'<ellipse cx="357" cy="157" rx="64" ry="24"/><path d="M293 157v109a64 24 0 0 0 128 0V157"/><ellipse cx="357" cy="266" rx="64" ry="24"/><path d="M305 190h104m-104 20h104m-104 20h104m12 46q51 7 47 37"/>',
 fan:'<rect x="276" y="143" width="161" height="161" rx="13"/><circle cx="357" cy="224" r="59"/><path d="M357 224q-55-65-2-54t2 54q67-40 52 10t-52-10q-12 75-50 34t50-34"/><path d="M236 204h27m-27 23h27m-27 23h27"/>',
 clamp:'<path d="M295 302h132m-67 0v-68m0 0-58-48-22-41m80 89 58-48 20-41m-173-4 17-9 24 13m109 1 24-13 17 9"/><circle cx="360" cy="234" r="11"/>',
 clean:'<path d="M287 210v78h140v-78"/><ellipse cx="357" cy="210" rx="70" ry="30"/><path d="m301 202 32 23 15-37 23 38 32-29m-85-43 48 56 17-12-43-62"/>'
};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const mapping=[];
for(const [old,title,input,output,icon] of specs){
 const slug=old.toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9]+/g,'-');
 const target='assets/images/lessons/electronics-reference/'+slug+'.svg';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" role="img" aria-label="${esc(title)} concept diagram"><title>${esc(title)}</title><rect width="720" height="420" rx="24" fill="#f4f8fa"/><rect x="24" y="24" width="672" height="372" rx="18" fill="#fff" stroke="#b6ccd5"/><text x="48" y="62" fill="#194c62" font-family="sans-serif" font-size="14" letter-spacing="2">ELECTRONICS · CONCEPT VIEW</text><text x="48" y="100" fill="#173542" font-family="sans-serif" font-size="${title.length>28?24:29}" font-weight="700">${esc(title)}</text><g fill="none" stroke="#1e7180" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" font-family="sans-serif" font-size="26">${icons[icon]}</g><path d="M170 223h53m-12-10 12 10-12 10M493 223h53m-12-10 12 10-12 10" fill="none" stroke="#b56d28" stroke-width="4"/><text x="134" y="339" text-anchor="middle" fill="#173542" font-family="sans-serif" font-size="17">${esc(input)}</text><text x="570" y="339" text-anchor="middle" fill="#173542" font-family="sans-serif" font-size="17">${esc(output)}</text><text x="360" y="376" text-anchor="middle" fill="#425866" font-family="sans-serif" font-size="13">Original ClassroomOS diagram · CC0 · Concept only; verify the actual board and pin labels.</text></svg>\n`;
 await writeFile(new URL(slug+'.svg',out),svg);mapping.push({old:'assets/thumbs/'+old,target,title});
}
await writeFile(new URL('sources.json',out),JSON.stringify({creator:'ClassroomOS',created:'2026-11-15',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',description:'Original schematic teaching drawings; no source photographs traced. Not product photos, scale drawings or wiring diagrams.',assets:mapping},null,2)+'\n');
