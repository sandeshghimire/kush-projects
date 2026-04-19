export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface CurriculumItem {
    kind: "lesson" | "project";
    order: number;
    slug: string;
    title: string;
    description: string;
    topic: string;
    difficulty: Difficulty;
    estimatedMinutes: number;
}

export const lessons: CurriculumItem[] = [
    {
        kind: "lesson",
        order: 1,
        slug: "lesson-1",
        title: "Meet the Pico 2 & Your First Blink",
        description:
            "Unbox your Raspberry Pi Pico 2, set up the toolchain, and write your very first program to blink an LED on and off.",
        topic: "Setup",
        difficulty: "Beginner",
        estimatedMinutes: 25,
    },
    {
        kind: "lesson",
        order: 2,
        slug: "lesson-2",
        title: "Digital Outputs — Controlling LEDs",
        description:
            "Learn how GPIO pins work as digital outputs and control multiple LEDs with simple on/off logic using C code.",
        topic: "GPIO",
        difficulty: "Beginner",
        estimatedMinutes: 25,
    },
    {
        kind: "lesson",
        order: 3,
        slug: "lesson-3",
        title: "Digital Inputs — Buttons and Debouncing",
        description:
            "Read button presses through GPIO inputs and learn software debouncing to get clean, reliable signals every time.",
        topic: "GPIO",
        difficulty: "Beginner",
        estimatedMinutes: 30,
    },
    {
        kind: "lesson",
        order: 4,
        slug: "lesson-4",
        title: "PWM — Dimming LEDs and Making Tones",
        description:
            "Discover Pulse Width Modulation to smoothly dim LEDs and generate buzzer tones by varying duty cycles and frequencies.",
        topic: "PWM",
        difficulty: "Beginner",
        estimatedMinutes: 35,
    },
    {
        kind: "lesson",
        order: 5,
        slug: "lesson-5",
        title: "ADC — Reading Analog Sensors",
        description:
            "Use the Pico's built-in Analog-to-Digital Converter to read voltages from sensors like potentiometers and light-dependent resistors.",
        topic: "ADC",
        difficulty: "Beginner",
        estimatedMinutes: 40,
    },
    {
        kind: "lesson",
        order: 6,
        slug: "lesson-6",
        title: "Timers, Interrupts & Non-Blocking Code",
        description:
            "Move beyond delay loops by using hardware timers and interrupts to run code at precise intervals without blocking.",
        topic: "Timers/Interrupts",
        difficulty: "Intermediate",
        estimatedMinutes: 45,
    },
    {
        kind: "lesson",
        order: 7,
        slug: "lesson-7",
        title: "UART / Serial — Printing and Debugging",
        description:
            "Set up UART serial communication to print debug messages to your computer and send data between devices.",
        topic: "UART",
        difficulty: "Beginner",
        estimatedMinutes: 35,
    },
    {
        kind: "lesson",
        order: 8,
        slug: "lesson-8",
        title: "I2C — Talking to an OLED Display",
        description:
            "Master the I2C protocol by wiring up an SSD1306 OLED display and drawing text, shapes, and sensor readings on screen.",
        topic: "I2C",
        difficulty: "Intermediate",
        estimatedMinutes: 60,
    },
    {
        kind: "lesson",
        order: 9,
        slug: "lesson-9",
        title: "SPI — Fast Serial Communication",
        description:
            "Explore the SPI bus for high-speed data transfers, connecting peripherals like SD cards and fast display modules.",
        topic: "SPI",
        difficulty: "Intermediate",
        estimatedMinutes: 45,
    },
    {
        kind: "lesson",
        order: 10,
        slug: "lesson-10",
        title: "C Projects, Headers & CMake",
        description:
            "Organize multi-file C projects with header files and CMakeLists, learning the build system that powers every Pico program.",
        topic: "Systems",
        difficulty: "Intermediate",
        estimatedMinutes: 50,
    },
    {
        kind: "lesson",
        order: 11,
        slug: "lesson-11",
        title: "PIO — The Pico's Superpower",
        description:
            "Unlock the Programmable I/O state machines to create custom hardware interfaces that run independently of the CPU.",
        topic: "PIO",
        difficulty: "Advanced",
        estimatedMinutes: 70,
    },
    {
        kind: "lesson",
        order: 12,
        slug: "lesson-12",
        title: "Multicore — Two CPUs, One Robot",
        description:
            "Harness both ARM Cortex-M33 cores on the Pico 2, running tasks in parallel with safe inter-core communication.",
        topic: "Multicore",
        difficulty: "Advanced",
        estimatedMinutes: 50,
    },
    {
        kind: "lesson",
        order: 13,
        slug: "lesson-13",
        title: "Driving DC Motors with an H-Bridge",
        description:
            "Control the speed and direction of DC motors using an H-Bridge driver chip and PWM signals from the Pico.",
        topic: "Motor Control",
        difficulty: "Intermediate",
        estimatedMinutes: 60,
    },
    {
        kind: "lesson",
        order: 14,
        slug: "lesson-14",
        title: "Servo Motors — Precise Angles",
        description:
            "Command servo motors to exact angles using PWM pulse widths, the foundation for robotic arms and steering.",
        topic: "Motor Control",
        difficulty: "Intermediate",
        estimatedMinutes: 35,
    },
    {
        kind: "lesson",
        order: 15,
        slug: "lesson-15",
        title: "Stepper Motors — Stepping One Click at a Time",
        description:
            "Drive stepper motors with precise step sequences, learning full-step, half-step, and microstepping techniques.",
        topic: "Motor Control",
        difficulty: "Advanced",
        estimatedMinutes: 45,
    },
    {
        kind: "lesson",
        order: 16,
        slug: "lesson-16",
        title: "Distance Sensors — Seeing the World",
        description:
            "Measure distances with ultrasonic HC-SR04 and infrared sensors, giving your robot spatial awareness of its surroundings.",
        topic: "Sensors",
        difficulty: "Intermediate",
        estimatedMinutes: 50,
    },
    {
        kind: "lesson",
        order: 17,
        slug: "lesson-17",
        title: "The IMU — Accelerometer & Gyro",
        description:
            "Read acceleration and rotation data from an MPU-6050 IMU to detect orientation, motion, and tilt angles.",
        topic: "IMU",
        difficulty: "Advanced",
        estimatedMinutes: 60,
    },
    {
        kind: "lesson",
        order: 18,
        slug: "lesson-18",
        title: "Wi-Fi on the Pico 2 W",
        description:
            "Connect your Pico 2 W to a Wi-Fi network and make HTTP requests to send sensor data to the cloud or a local server.",
        topic: "WiFi",
        difficulty: "Advanced",
        estimatedMinutes: 70,
    },
    {
        kind: "lesson",
        order: 19,
        slug: "lesson-19",
        title: "Power, Batteries & Sleep Modes",
        description:
            "Design battery-powered circuits, regulate voltage for your robot, and use sleep modes to conserve precious energy.",
        topic: "Power",
        difficulty: "Intermediate",
        estimatedMinutes: 40,
    },
    {
        kind: "lesson",
        order: 20,
        slug: "lesson-20",
        title: "Putting It All Together — Architecture of a Robot",
        description:
            "Design the full software architecture of a robot: task scheduling, state machines, sensor fusion, and clean module boundaries.",
        topic: "Systems",
        difficulty: "Advanced",
        estimatedMinutes: 60,
    },
];

export const projects: CurriculumItem[] = [
    {
        kind: "project",
        order: 1,
        slug: "project-1",
        title: "Build the Power Module",
        description:
            "Assemble the battery pack and voltage regulator that will supply stable power to every component on your robot.",
        topic: "Power",
        difficulty: "Intermediate",
        estimatedMinutes: 60,
    },
    {
        kind: "project",
        order: 2,
        slug: "project-2",
        title: "Mount the Brain: Pico on the Chassis",
        description:
            "Secure the Raspberry Pi Pico 2 to the robot chassis and set up the wiring harness for all future connections.",
        topic: "Systems",
        difficulty: "Beginner",
        estimatedMinutes: 45,
    },
    {
        kind: "project",
        order: 3,
        slug: "project-3",
        title: "Wire Up the Motor Driver Board",
        description:
            "Connect the H-Bridge motor driver to the Pico and both DC motors, creating the drive system for your robot.",
        topic: "Motor Control",
        difficulty: "Intermediate",
        estimatedMinutes: 60,
    },
    {
        kind: "project",
        order: 4,
        slug: "project-4",
        title: "First Drive! Forward, Back, and Turn",
        description:
            "Write your first drive code to make the robot move forward, reverse, and execute turns using differential steering.",
        topic: "Motor Control",
        difficulty: "Intermediate",
        estimatedMinutes: 50,
    },
    {
        kind: "project",
        order: 5,
        slug: "project-5",
        title: "Wheel Encoders — Counting Rotations",
        description:
            "Install and read wheel encoders to accurately measure how far each wheel has traveled using interrupt-driven counting.",
        topic: "Sensors",
        difficulty: "Intermediate",
        estimatedMinutes: 60,
    },
    {
        kind: "project",
        order: 6,
        slug: "project-6",
        title: "Closed-Loop Speed Control",
        description:
            "Implement a PID controller that uses encoder feedback to maintain precise, consistent wheel speeds on any surface.",
        topic: "Motor Control",
        difficulty: "Advanced",
        estimatedMinutes: 75,
    },
    {
        kind: "project",
        order: 7,
        slug: "project-7",
        title: "Front Ultrasonic Eye",
        description:
            "Mount an ultrasonic distance sensor on the front of your robot and write the driver to measure obstacle distance.",
        topic: "Sensors",
        difficulty: "Intermediate",
        estimatedMinutes: 45,
    },
    {
        kind: "project",
        order: 8,
        slug: "project-8",
        title: "Autonomous Obstacle Avoidance",
        description:
            "Program your robot to navigate a room autonomously, detecting walls and obstacles and steering around them in real time.",
        topic: "Systems",
        difficulty: "Advanced",
        estimatedMinutes: 75,
    },
    {
        kind: "project",
        order: 9,
        slug: "project-9",
        title: "IR Line Sensor Array",
        description:
            "Install an array of infrared reflectance sensors on the underside of your robot to detect lines on the ground.",
        topic: "Sensors",
        difficulty: "Intermediate",
        estimatedMinutes: 60,
    },
    {
        kind: "project",
        order: 10,
        slug: "project-10",
        title: "Line Follower Mode",
        description:
            "Build a line-following algorithm that uses the IR sensor array and PID control to smoothly trace a black line track.",
        topic: "Systems",
        difficulty: "Advanced",
        estimatedMinutes: 75,
    },
    {
        kind: "project",
        order: 11,
        slug: "project-11",
        title: "Install the IMU",
        description:
            "Mount and calibrate the MPU-6050 IMU on your robot so it can sense tilt, rotation, and acceleration during movement.",
        topic: "IMU",
        difficulty: "Intermediate",
        estimatedMinutes: 45,
    },
    {
        kind: "project",
        order: 12,
        slug: "project-12",
        title: "Drive Straight & Turn Exact Degrees",
        description:
            "Fuse encoder and IMU data to make your robot drive perfectly straight and execute precise degree-accurate turns.",
        topic: "Systems",
        difficulty: "Advanced",
        estimatedMinutes: 75,
    },
    {
        kind: "project",
        order: 13,
        slug: "project-13",
        title: "OLED Status Display",
        description:
            "Wire up an SSD1306 OLED and code a live status screen showing battery level, mode, speed, and sensor readings.",
        topic: "I2C",
        difficulty: "Intermediate",
        estimatedMinutes: 45,
    },
    {
        kind: "project",
        order: 14,
        slug: "project-14",
        title: "RGB Status Bar (Neopixels + PIO)",
        description:
            "Add a strip of WS2812B Neopixel LEDs driven by PIO to display colorful animations that show your robot's state.",
        topic: "PIO",
        difficulty: "Advanced",
        estimatedMinutes: 60,
    },
    {
        kind: "project",
        order: 15,
        slug: "project-15",
        title: "Buzzer & Sound Effects",
        description:
            "Connect a piezo buzzer and program fun sound effects using PWM tones for startup jingles, alerts, and feedback.",
        topic: "PWM",
        difficulty: "Beginner",
        estimatedMinutes: 30,
    },
    {
        kind: "project",
        order: 16,
        slug: "project-16",
        title: "Mode Button & State Machine",
        description:
            "Add a physical button that cycles through robot modes using a clean state machine: idle, line-follow, obstacle-avoid, and remote.",
        topic: "GPIO",
        difficulty: "Intermediate",
        estimatedMinutes: 45,
    },
    {
        kind: "project",
        order: 17,
        slug: "project-17",
        title: "UART Remote Control (Bluetooth HC-05)",
        description:
            "Pair an HC-05 Bluetooth module via UART and build a wireless remote control protocol for driving your robot from a phone.",
        topic: "UART",
        difficulty: "Intermediate",
        estimatedMinutes: 60,
    },
    {
        kind: "project",
        order: 18,
        slug: "project-18",
        title: "Wi-Fi Web Joystick Control",
        description:
            "Host a tiny web server on the Pico 2 W that serves a virtual joystick page for controlling your robot over Wi-Fi.",
        topic: "WiFi",
        difficulty: "Advanced",
        estimatedMinutes: 90,
    },
    {
        kind: "project",
        order: 19,
        slug: "project-19",
        title: "Telemetry Dashboard",
        description:
            "Stream real-time sensor data over Wi-Fi to a live web dashboard showing speed, distance, battery, and IMU graphs.",
        topic: "WiFi",
        difficulty: "Advanced",
        estimatedMinutes: 75,
    },
    {
        kind: "project",
        order: 20,
        slug: "project-20",
        title: "Missions! Full Autonomy & Integration",
        description:
            "Combine everything into a fully autonomous robot that completes challenge missions: navigate mazes, follow lines, and avoid obstacles.",
        topic: "Systems",
        difficulty: "Advanced",
        estimatedMinutes: 120,
    },
];

export const allItems: CurriculumItem[] = [...lessons, ...projects];

export const topicColors: Record<string, string> = {
    Setup: "bg-slate-100 text-slate-700",
    GPIO: "bg-slate-100 text-slate-700",
    PWM: "bg-indigo-100 text-indigo-700",
    ADC: "bg-cyan-100 text-cyan-700",
    "Timers/Interrupts": "bg-amber-100 text-amber-700",
    UART: "bg-teal-100 text-teal-700",
    I2C: "bg-purple-100 text-purple-700",
    SPI: "bg-pink-100 text-pink-700",
    PIO: "bg-fuchsia-100 text-fuchsia-700",
    Multicore: "bg-emerald-100 text-emerald-700",
    "Motor Control": "bg-orange-100 text-orange-700",
    Sensors: "bg-lime-100 text-lime-700",
    IMU: "bg-rose-100 text-rose-700",
    WiFi: "bg-sky-100 text-sky-700",
    Power: "bg-yellow-100 text-yellow-700",
    Systems: "bg-violet-100 text-violet-700",
};

export const funFacts: string[] = [
    "The first microcontroller, the TMS1000, was released by Texas Instruments in 1974.",
    "The Raspberry Pi Pico 2 uses the RP2350 chip with dual ARM Cortex-M33 cores running at 150 MHz.",
    "PWM was invented in the 1960s and is still the most common way to control motor speed today.",
    "The word 'robot' comes from the Czech word 'robota', meaning forced labor, coined in a 1920 play.",
    "I2C was invented by Philips Semiconductor in 1982 to let chips talk to each other on a circuit board.",
    "SPI can transfer data at speeds up to 65 MHz on the Pico, much faster than I2C's 400 kHz.",
    "The ultrasonic sensor works exactly like a bat — it sends out a sound pulse and listens for the echo.",
    "An IMU (Inertial Measurement Unit) is the same type of sensor that helps drones stay balanced in flight.",
    "The Pico's PIO state machines are so fast they can bit-bang protocols that normally need dedicated hardware.",
    "UART is one of the oldest serial protocols, dating back to the 1960s teletype machines.",
    "A typical DC motor spins at 200 RPM, which is about 3.3 full rotations every second.",
    "The first mobile robot, Shakey, was built at Stanford Research Institute in 1966.",
    "Neopixel LEDs contain a tiny microcontroller inside each individual LED package.",
    "The Pico 2 has 520 KB of SRAM — that's over 500,000 bytes of working memory for your code.",
    "PID controllers are used in everything from cruise control in cars to temperature regulation in ovens.",
    "Bluetooth was named after Harald Bluetooth, a 10th-century Danish king who united warring factions.",
    "The first line-following robot was built in the late 1960s using analog circuits and photocells.",
    "Wi-Fi stands for nothing — it's a trademark name created by a branding company in 1999.",
    "A stepper motor can have up to 200 steps per revolution, giving it 1.8° precision per step.",
    "The Mars rovers use a similar sensor fusion approach to what you'll build: IMU + wheel encoders.",
    "An H-Bridge is named after the shape of its circuit diagram, which looks like the letter H.",
    "The Pico 2's dual-core design means one core can handle motors while the other reads sensors.",
    "OLED displays don't need a backlight — each pixel produces its own light, saving power.",
    "The first Arduino board was created in 2005 in Ivrea, Italy, as a tool for design students.",
    "Servo motors contain a DC motor, a gear train, and a feedback potentiometer in one tiny package.",
    "The Pico's ADC has 12-bit resolution, meaning it can distinguish 4,096 different voltage levels.",
    "Wheel encoders on Mars rovers have helped NASA track distances across the Martian surface.",
    "CMake was created in 2000 and is now the most widely used build system for C and C++ projects.",
    "The HC-SR04 ultrasonic sensor can measure distances from 2 cm to 4 meters with 3 mm accuracy.",
    "Sleep modes can reduce the Pico's power consumption from 25 mA down to just 1.3 mA.",
    "The first programmable robot arm, Unimate, was installed in a General Motors factory in 1961.",
    "Capacitors used for debouncing buttons were one of the earliest electronic filter circuits ever designed.",
    "The RP2350 chip has hardware interpolators that can speed up audio and graphics calculations.",
    "IR line sensors work by bouncing infrared light off the surface and measuring how much reflects back.",
    "The term 'bit-banging' means using software to manually toggle pins to create a communication protocol.",
    "A single WS2812B Neopixel LED draws up to 60 mA at full white brightness.",
    "The Pico 2 has 4 MB of flash memory — enough to store thousands of lines of C code.",
    "Voltage regulators waste excess energy as heat, which is why efficient DC-DC converters are preferred for robots.",
    "The fastest hobby servo can rotate 60 degrees in just 0.06 seconds.",
    "Real-time operating systems (RTOS) can run on the Pico, scheduling tasks with microsecond precision.",
];
