export type PartId =
  | 'engine-block'
  | 'pistons'
  | 'connecting-rods'
  | 'crankshaft'
  | 'flywheel'
  | 'cylinder-head'
  | 'intake-valves'
  | 'exhaust-valves'
  | 'valve-springs'
  | 'camshafts'
  | 'timing-belt'
  | 'accessory-belt'
  | 'water-pump'
  | 'alternator'
  | 'spark-plugs'
  | 'ignition-coils'
  | 'valve-cover'
  | 'intake-manifold'
  | 'throttle-body'
  | 'exhaust-manifold'
  | 'oil-pan'

export type Part = {
  id: PartId
  name: string
  jp: string
  short: string
  details: string[]
  facts: [string, string][]
  track: string
}

export const PARTS: Part[] = [
  {
    id: 'engine-block',
    name: 'Engine block',
    jp: 'シリンダーブロック',
    short:
      'The backbone of the engine. One casting holds the four cylinders, carries the crankshaft underneath and has coolant and oil channels running through its walls.',
    details: [
      'Everything else bolts to the block. The cylinders are bored straight into it, the crankshaft hangs from its main bearings underneath, and the cylinder head clamps down on its flat top face, called the deck.',
      'Inside the walls run two hidden networks: the water jacket, where coolant flows around the cylinders to carry heat away, and the oil galleries, which feed pressurised oil to every bearing.',
      'Blocks are cast from iron or aluminium. Aluminium saves weight but is soft, so the bores get iron liners or a hard coating such as Nikasil or a plasma-sprayed layer for the piston rings to run on.',
    ],
    facts: [
      ['Material', 'Cast iron or aluminium alloy'],
      ['This engine', '4 cylinders in a row, 86 mm bores'],
      ['Main bearings', '5: between each pair of cylinders and at both ends'],
    ],
    track:
      'Engines built for big turbo boost often use a closed-deck block, where the top of the water jacket is solid metal around the cylinders. Toyota’s cast-iron 2JZ-GTE is famous for exactly that.',
  },
  {
    id: 'pistons',
    name: 'Pistons',
    jp: 'ピストン',
    short:
      'The pistons slide up and down inside the cylinders. Burning fuel pushes them down, and that push is the only thing that makes the engine go.',
    details: [
      'A piston is a hollow aluminium cup. Its top, the crown, faces the combustion chamber and takes the full force of every burn: typically 50 to 80 bar in a petrol engine, and well over 100 bar in a hard-working turbo engine.',
      'Three rings sit in grooves near the top. The upper two are compression rings that seal the gas above the piston. The lowest is the oil-control ring, which scrapes oil off the cylinder wall so it isn’t burned.',
      'A steel wrist pin, also called a gudgeon pin, runs through the piston sideways and links it to the connecting rod.',
    ],
    facts: [
      ['Material', 'Cast or forged aluminium alloy'],
      ['Rings', '2 compression, 1 oil control'],
      ['Travel', '86 mm each stroke in this engine'],
    ],
    track:
      'At 18,000 rpm a piston stops and changes direction 600 times every second. Racing pistons are forged rather than cast so the metal survives that.',
  },
  {
    id: 'connecting-rods',
    name: 'Connecting rods',
    jp: 'コンロッド',
    short:
      'Each rod links a piston to the crankshaft. It turns the piston’s straight up-and-down push into a turning force on the crank.',
    details: [
      'The small end grips the wrist pin inside the piston. The big end wraps around a crankpin on the crankshaft, with thin bearing shells in between that ride on a film of oil.',
      'A rod is pulled as hard as it is pushed. At high rpm the piston has to be stopped and dragged back at the end of every stroke, so the rod sees huge tension as well as compression.',
      'Most rods are forged steel with an I-beam section. On many modern engines the big-end cap is snapped off the rod during manufacture and bolted back on, so the broken surfaces lock together perfectly.',
    ],
    facts: [
      ['Material', 'Forged steel; titanium in racing'],
      ['Length here', '145 mm centre to centre'],
      ['Big end', 'Split cap held by two bolts'],
    ],
    track:
      'Racing engines often use titanium rods. They do the same job at roughly 40% less weight, which lets the engine rev higher and faster.',
  },
  {
    id: 'crankshaft',
    name: 'Crankshaft',
    jp: 'クランクシャフト',
    short:
      'The crankshaft turns the pistons’ up-and-down motion into rotation. Everything the engine delivers leaves through this one shaft.',
    details: [
      'The rods ride on offset journals called crankpins. The distance from the crank’s centre line to a crankpin is the throw; twice the throw is the stroke, 86 mm here.',
      'The main journals sit on the centre line and turn in the block’s main bearings. Heavy counterweights opposite each crankpin balance the weight of the rods and pistons.',
      'On this inline-four the outer two crankpins point one way and the middle two the other. Pistons 1 and 4 move together, so do 2 and 3, and the cylinders fire in the order 1-3-4-2, one every half turn.',
    ],
    facts: [
      ['Material', 'Forged or cast steel'],
      ['Crankpins', '4, set 180° apart'],
      ['Firing order', '1-3-4-2'],
    ],
    track:
      'Racing cranks are machined from a solid steel billet and knife-edged: the counterweights get sharp leading edges so they cut through the oil mist in the crankcase instead of churning it.',
  },
  {
    id: 'flywheel',
    name: 'Flywheel',
    jp: 'フライホイール',
    short:
      'A heavy steel disc on the back of the crankshaft. It evens out the pulses from each power stroke and gives the starter motor and clutch something to grip.',
    details: [
      'The crank only gets a push during power strokes, so on its own it speeds up and slows down through every cycle. The flywheel’s mass stores energy during each push and gives it back between them, keeping the rotation even.',
      'The toothed ring around its edge is the ring gear: the starter motor meshes with it to spin the engine when you start it. The flat machined face is where the clutch clamps on to pass power to the gearbox.',
    ],
    facts: [
      ['Material', 'Steel or cast iron'],
      ['Ring gear', 'Turned by the starter motor'],
      ['Speed', 'Same as the crankshaft'],
    ],
    track:
      'Lightweight flywheels let a race engine rev up and down faster, which helps quick gear changes. The cost is a lumpier idle and an engine that stalls more easily.',
  },
  {
    id: 'cylinder-head',
    name: 'Cylinder head',
    jp: 'シリンダーヘッド',
    short:
      'The head seals the top of the cylinders. It carries the valves, camshafts and spark plugs, and its ports are the passages that air comes in through and exhaust goes out of.',
    details: [
      'The underside is shaped into a small roof over each cylinder: the combustion chamber. This is a pent-roof chamber, the most common modern design, with the valves on its two slopes and the spark plug at the peak.',
      'Intake ports run in from one side and exhaust ports run out the other. This cross-flow layout lets air pass straight through the head without turning back on itself.',
      'Heads are cast aluminium because it carries heat away quickly. A head gasket between the head and the block seals in combustion pressure, coolant and oil.',
    ],
    facts: [
      ['Material', 'Cast aluminium alloy'],
      ['Valves', '16, four per cylinder'],
      ['Layout', 'DOHC, cross-flow'],
    ],
    track:
      'Port shape decides how well an engine breathes. Tuners reshape and smooth the ports by hand, a job called porting, to find extra power at high rpm.',
  },
  {
    id: 'intake-valves',
    name: 'Intake valves',
    jp: '吸気バルブ',
    short:
      'Two per cylinder. They open to let the air and fuel mixture into the cylinder, then shut to seal it in for compression and the burn.',
    details: [
      'A valve is a long steel part with a round head that seals against a hardened seat in the head, and a stem that slides in a guide. The cam pushes the stem down to open it; a spring pulls it shut again.',
      'Intake valves are bigger than exhaust valves. Air only gets into the cylinder because the falling piston lowers the pressure, a weak pull, so it needs all the opening it can get. Exhaust gas leaves under its own pressure.',
      'Two smaller valves give more opening area than one big one in the same space, and lighter valves can be opened and closed faster.',
    ],
    facts: [
      ['Per cylinder', '2'],
      ['Head diameter', '30 mm here'],
      ['Timing (street cam)', 'Opens 10° before top dead centre, closes 40° after bottom dead centre'],
    ],
    track:
      'Performance engines use titanium intake valves, about 40% lighter than steel, so the springs can control them at higher rpm. Chevrolet’s LS7 V8 shipped with them as standard.',
  },
  {
    id: 'exhaust-valves',
    name: 'Exhaust valves',
    jp: '排気バルブ',
    short:
      'Two per cylinder. They open near the end of the power stroke to let the burnt gas out as the piston rises.',
    details: [
      'Exhaust valves have the hardest job in the engine. They sit in gas at roughly 700 to 900 °C and can only shed heat through their seat and stem, mostly while they are closed.',
      'They are made from heat-resistant steel alloys. In high-performance engines the stems are hollow and partly filled with sodium, which melts and sloshes up and down, carrying heat from the head into the stem.',
      'They open before the piston reaches the bottom, while there is still pressure in the cylinder. That pressure blows most of the gas out on its own; this is called blowdown.',
    ],
    facts: [
      ['Per cylinder', '2'],
      ['Head diameter', '26 mm here'],
      ['Timing (street cam)', 'Opens 40° before bottom dead centre, closes 10° after top dead centre'],
    ],
    track:
      'Around top dead centre between the exhaust and intake strokes, both valves are open for a moment. This is overlap. Race cams stretch it so the outgoing exhaust helps pull fresh charge in at high rpm, which is why race engines idle so roughly.',
  },
  {
    id: 'valve-springs',
    name: 'Valve springs & buckets',
    jp: 'バルブスプリング',
    short:
      'Each valve has a coil spring that pulls it shut after the cam pushes it open. On top of each valve sits a bucket tappet that the cam lobe presses on.',
    details: [
      'The spring sits between a seat on the head and a retainer locked to the top of the valve stem. When the cam pushes the valve open the spring is squeezed, and as the lobe turns past, the spring snaps the valve shut.',
      'If the spring is too weak for the rpm, the valve can’t keep up with the cam: it floats, bounces on its seat or closes late, and in the worst case meets the rising piston. Stiffer springs prevent that but add friction.',
      'This engine uses bucket tappets: steel cups between the cam and the valve. The lobe slides across the bucket’s flat top, and the bucket takes the sideways load so the valve stem doesn’t.',
    ],
    facts: [
      ['Count', '16 springs, 16 buckets'],
      ['Job', 'Close the valve and keep it following the cam'],
      ['Failure', 'Valve float at high rpm'],
    ],
    track:
      'Formula 1 replaced steel springs with pneumatic valves, first raced by Renault in 1986: compressed gas closes the valve. Ducati took another route on its motorcycles with desmodromic valves, closed by a second cam instead of a spring.',
  },
  {
    id: 'camshafts',
    name: 'Camshafts',
    jp: 'カムシャフト',
    short:
      'Two shafts with egg-shaped lobes that open the valves at exactly the right moment. They turn at half the crankshaft’s speed.',
    details: [
      'Each lobe is round on one side, the base circle, where the valve stays shut, and drawn out into a nose on the other. As the shaft turns, the nose pushes the bucket down and opens the valve, then lets it close.',
      'A four-stroke cylinder needs each valve to open once every two turns of the crank, so the timing belt drives the cams at exactly half crank speed.',
      'This engine is DOHC, double overhead cam: one camshaft for the intake valves and one for the exhaust valves, both in the head. How far and for how long the lobes open the valves sets much of the engine’s character.',
    ],
    facts: [
      ['Count', '2, intake and exhaust'],
      ['Speed', 'Half of crank speed'],
      ['Lobes', '16, one per valve'],
    ],
    track:
      'Honda’s VTEC adds a wilder third lobe for each pair of valves and locks the valves onto it high in the rev range: a mild cam for town and a race cam near the redline.',
  },
  {
    id: 'timing-belt',
    name: 'Timing belt',
    jp: 'タイミングベルト',
    short:
      'A toothed belt that keeps the camshafts locked in step with the crankshaft, so every valve opens at the right point in every piston’s stroke.',
    details: [
      'The cam sprockets have exactly twice as many teeth as the crank sprocket, 40 and 20 here, so the cams turn once for every two turns of the crank.',
      'The belt is reinforced with glass or aramid fibre cords so it doesn’t stretch, and its teeth can’t slip, so the timing never drifts.',
      'Many engines are interference designs: the valves and pistons use the same space at different times. If the belt snaps, the cams stop while the crank keeps turning and the pistons hit the open valves. That is why belts are replaced on a schedule, often around every 100,000 km.',
    ],
    facts: [
      ['Ratio', '2 : 1, crank to cams'],
      ['Teeth', '20 on the crank, 40 on each cam'],
      ['Alternatives', 'Chain or gear drive'],
    ],
    track:
      'Many race engines drive their cams with a train of gears instead of a belt or chain. Gears are heavier and noisier, but they can’t stretch or skip at very high rpm.',
  },
  {
    id: 'accessory-belt',
    name: 'Accessory belt',
    jp: '補機ベルト',
    short:
      'One long ribbed belt on the front of the engine. The crankshaft pulley drives it, and it snakes around the water pump, the alternator and a spring-loaded tensioner.',
    details: [
      'Modern engines use a single serpentine belt instead of several separate V-belts. Its inside face has five or six small V-shaped ribs that grip matching grooves in each pulley, so it can transmit a lot of torque without slipping.',
      'An automatic tensioner, a pulley on a sprung arm, keeps the belt at the right tightness as it stretches and as the engine heats up. Too loose and it squeals and slips; too tight and it wears the pulley bearings.',
      'The crank pulley is also a harmonic damper. A rubber ring bonded between its hub and its outer rim absorbs the twisting vibration that each firing pulse sends along the crankshaft.',
      'Unlike the timing belt, the accessory belt does not keep anything in sync. If it snaps the engine keeps running, but the battery stops charging and, on many cars, the coolant stops flowing.',
    ],
    facts: [
      ['Drives', 'Water pump, alternator; on cars, often A/C and power steering'],
      ['Type', 'Poly-V (multi-rib) serpentine belt'],
      ['Typical life', 'Around 100,000 km, inspected for cracks'],
    ],
    track:
      'Race engines strip the accessory drive to the minimum. Formula 1 power units have no belt at all: the pumps are gear-driven from the crankshaft and the electrics come from the hybrid system.',
  },
  {
    id: 'water-pump',
    name: 'Water pump',
    jp: 'ウォーターポンプ',
    short:
      'A small centrifugal pump that pushes coolant through the engine. Without it, the cylinders would overheat within minutes.',
    details: [
      'Inside the housing an impeller with curved vanes spins with the pulley. It flings coolant outward into the block’s water jacket, where it flows around the cylinders, up into the head and out to the radiator.',
      'A thermostat between the engine and the radiator stays shut while the engine is cold so it warms up quickly, then opens at around 82 to 95 °C and lets coolant through the radiator to shed heat.',
      'The coolant is a mix of water and glycol. The glycol lowers the freezing point and raises the boiling point, and the system runs pressurised at about 1 bar so it can reach roughly 120 °C without boiling.',
      'Here the pump sits inside the timing-belt loop and is driven by the accessory belt. On many Toyota and Volkswagen engines it is driven by the timing belt itself, which is why the two are changed together.',
    ],
    facts: [
      ['Type', 'Centrifugal impeller'],
      ['Flow', 'Roughly 100 to 200 litres a minute at high revs'],
      ['Failure sign', 'Coolant weeping from the weep hole, or a whining bearing'],
    ],
    track:
      'Many race and some road engines now use electric water pumps, which can run at exactly the speed the cooling needs and keep circulating coolant after the engine is switched off.',
  },
  {
    id: 'alternator',
    name: 'Alternator',
    jp: 'オルタネーター',
    short:
      'The engine’s generator. It turns a little of the crank’s power into electricity to run the ignition, the fuel injectors and the car, and keeps the battery charged.',
    details: [
      'A spinning electromagnet, the rotor, sits inside fixed copper windings, the stator. As the rotor turns, its field sweeps past the windings and induces alternating current in them.',
      'Diodes in the rectifier turn that into direct current, and a voltage regulator varies the rotor’s field so the output stays at about 14 volts whatever the engine speed.',
      'Its pulley is small, so it spins about two and a half times faster than the crank. The fan behind the pulley pulls air through the slotted case to cool the windings.',
      'Generating electricity takes real power. A hard-working alternator can absorb 2 to 3 kW, which is why many modern cars only charge hard when you lift off the throttle or brake.',
    ],
    facts: [
      ['Output', '13.8 to 14.5 V, typically 90 to 180 A'],
      ['Speed', 'About 2.5 × crank speed'],
      ['Efficiency', 'Around 50 to 70%'],
    ],
    track:
      'The idea of recovering energy went much further in racing: the MGU-K in a Formula 1 car is a motor-generator on the crankshaft that harvests energy under braking and gives it back as up to 350 kW of extra power from 2026.',
  },
  {
    id: 'spark-plugs',
    name: 'Spark plugs',
    jp: 'スパークプラグ',
    short:
      'One per cylinder, screwed into the peak of the combustion chamber. A spark jumps across its tip to light the compressed mixture.',
    details: [
      'The plug is a steel body around a ceramic insulator. High voltage arrives at the top and jumps the small gap between the centre electrode and the hooked ground electrode at the tip.',
      'The spark fires before the piston reaches the top, typically 10 to 40 degrees early depending on speed and load, because the flame needs time to spread across the chamber. Peak pressure should arrive just after top dead centre.',
      'Plugs come in heat ranges. A hot plug sheds heat slowly and burns off its deposits; a cold plug sheds heat quickly so its tip doesn’t glow and light the mixture early. Tuned engines usually run colder plugs.',
    ],
    facts: [
      ['Voltage at the gap', '20,000 to 40,000 V'],
      ['Fires', 'Once every two crank turns'],
      ['Tip', 'Iridium or platinum on modern plugs'],
    ],
    track:
      'Diesel engines have no spark plugs. They squeeze air so hard that it gets hot enough to ignite the fuel the instant it is injected.',
  },
  {
    id: 'ignition-coils',
    name: 'Ignition coils',
    jp: 'イグニッションコイル',
    short:
      'Each coil sits directly on top of a spark plug and turns the car’s 12 volts into the tens of thousands of volts needed to make a spark.',
    details: [
      'A coil is a transformer: a few hundred turns of thick wire wound around many thousands of turns of thin wire. Current builds up in the thick primary winding; when the engine computer cuts it, the collapsing magnetic field induces a huge voltage in the secondary.',
      'This layout is coil-on-plug: one coil per cylinder, with no distributor and no plug leads. The engine computer fires each coil on its own, so the timing can be adjusted for every cylinder on every cycle.',
    ],
    facts: [
      ['Input', '12 V'],
      ['Output', '20,000 to 40,000 V'],
      ['Layout', 'Coil-on-plug, one per cylinder'],
    ],
    track:
      'At very high rpm an ordinary coil has too little time to recharge between sparks, so race engines use capacitive-discharge or multi-spark ignition that fires faster and harder.',
  },
  {
    id: 'valve-cover',
    name: 'Valve cover',
    jp: 'ヘッドカバー',
    short:
      'The lid on top of the engine. It keeps the oil around the camshafts in and the dirt out, and carries the ignition coils.',
    details: [
      'The camshafts and valve springs are splashed with oil all the time. The cover seals that in with a rubber gasket around its edge, and the cap on top is where you add engine oil.',
      'It also holds a breather that sends crankcase gases, the small amount that leaks past the piston rings, back into the intake to be burned rather than released into the air.',
    ],
    facts: [
      ['Material', 'Aluminium, magnesium or plastic'],
      ['Seal', 'Rubber gasket'],
      ['Also called', 'Cam cover, rocker cover'],
    ],
    track:
      'Honda paints the cam covers of its Type R engines in red crinkle finish, which is how you can recognise one with the bonnet up.',
  },
  {
    id: 'intake-manifold',
    name: 'Intake manifold',
    jp: 'インテークマニホールド',
    short:
      'The pipework that shares incoming air evenly between the four cylinders. Air enters a chamber called the plenum, then runs down one runner to each cylinder.',
    details: [
      'The plenum is a calm volume of air that every runner draws from, so each cylinder gets the same amount.',
      'Runner length is tuned to pressure waves. When an intake valve shuts, a pressure wave bounces back up the runner; with the right length it returns to the valve just as it opens again and pushes in extra air. Long runners help at low rpm and short ones at high rpm, and some engines switch between the two.',
      'With port injection the fuel injectors sit in the runners, spraying fuel just behind the intake valves. Direct-injection engines spray straight into the cylinder instead.',
    ],
    facts: [
      ['Material', 'Cast aluminium or glass-filled nylon'],
      ['Runners', '4, equal length'],
      ['Fed by', 'The throttle body'],
    ],
    track:
      'Race engines often skip the shared plenum and give each cylinder its own throttle right at the port for instant response. BMW’s S54 straight-six in the E46 M3 is a well-known road-car example.',
  },
  {
    id: 'throttle-body',
    name: 'Throttle body',
    jp: 'スロットルボディ',
    short:
      'The engine’s air valve. A disc inside it, the butterfly, turns to let more or less air in, and that is how the accelerator pedal controls power.',
    details: [
      'A petrol engine burns its fuel at close to a fixed ratio, about 14.7 parts air to 1 part fuel by mass. To make less power it has to take in less air, and the throttle controls that: nearly closed at idle, wide open at full throttle.',
      'Modern throttles are drive-by-wire. The pedal only sends a signal, and the engine computer turns the butterfly with an electric motor.',
      'Throttling costs efficiency, because at part throttle the pistons have to pull against a partial vacuum. That pumping loss is one reason diesels, which don’t need a throttle, use less fuel.',
    ],
    facts: [
      ['Valve type', 'Butterfly'],
      ['Control', 'Electric motor, drive-by-wire'],
      ['Wide open', 'Maximum airflow and power'],
    ],
    track:
      'The Cosworth DFV, which won 155 Formula 1 races, used slide throttles: flat plates that slide across the intakes instead of a turning butterfly, so nothing is left in the airflow at full throttle.',
  },
  {
    id: 'exhaust-manifold',
    name: 'Exhaust manifold',
    jp: 'エキゾーストマニホールド',
    short:
      'Four pipes that collect burnt gas from each cylinder and merge it into one exhaust pipe. The coloured bands are heat tint from gas at up to around 900 °C.',
    details: [
      'This is a tubular header: four separate pipes of near-equal length, called primaries, that meet in a collector. Each exhaust pulse leaves low pressure behind it, and with tuned lengths that low pressure helps pull the next cylinder’s gas out. This is called scavenging.',
      'Cheaper engines use a single cast-iron log manifold instead. It is compact and durable, but the pulses from different cylinders get in each other’s way.',
      'Near the ports stainless steel turns straw, bronze, purple and blue as it heats up. That is the oxide layer on the surface growing thicker, not paint.',
    ],
    facts: [
      ['Layout', '4-into-1 header'],
      ['Gas temperature', 'Up to about 900 °C'],
      ['Material', 'Stainless steel'],
    ],
    track:
      'On a turbocharged engine the manifold feeds the turbo’s turbine instead of the tailpipe, and on a race car at full load you can see it glow orange.',
  },
  {
    id: 'oil-pan',
    name: 'Oil pan',
    jp: 'オイルパン',
    short:
      'The tray under the engine that holds the oil. A pump draws oil from the bottom of it and pushes it to every bearing, then it drains back down.',
    details: [
      'Oil does three jobs: it keeps metal surfaces apart on a thin film, it carries heat away from the pistons and bearings, and it washes away tiny particles of wear.',
      'The oil pump’s pickup sits in the deepest part of the pan. Baffles inside stop the oil sloshing away from it under hard cornering, braking and acceleration.',
    ],
    facts: [
      ['Holds', 'About 4 litres in a 2.0-litre engine'],
      ['Type', 'Wet sump'],
      ['Drain plug', 'At the lowest point'],
    ],
    track:
      'Race cars use a dry sump: pumps empty a shallow pan into a separate tank, so high cornering forces can’t starve the engine of oil, and the engine can sit lower in the car.',
  },
]

export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<PartId, Part>
