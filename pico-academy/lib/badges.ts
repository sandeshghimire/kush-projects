export interface BadgeDefinition {
    slug: string;
    itemSlug: string;
    title: string;
    description: string;
    iconPath: string;
}

function toKebab(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export const lessonBadges: BadgeDefinition[] = [
    {
        slug: "first-spark",
        itemSlug: "lesson-1",
        title: "First Spark",
        description: "You powered up the Pico and blinked your very first LED — the journey begins!",
        iconPath: "/badges/first-spark.svg",
    },
    {
        slug: "light-conductor",
        itemSlug: "lesson-2",
        title: "Light Conductor",
        description: "You commanded multiple LEDs through GPIO pins like a conductor leading an orchestra of light.",
        iconPath: "/badges/light-conductor.svg",
    },
    {
        slug: "button-master",
        itemSlug: "lesson-3",
        title: "Button Master",
        description: "You tamed noisy button signals with debouncing and can read digital inputs flawlessly.",
        iconPath: "/badges/button-master.svg",
    },
    {
        slug: "pulse-tamer",
        itemSlug: "lesson-4",
        title: "Pulse Tamer",
        description: "You harnessed PWM to smoothly dim LEDs and generate buzzer tones at will.",
        iconPath: "/badges/pulse-tamer.svg",
    },
    {
        slug: "signal-listener",
        itemSlug: "lesson-5",
        title: "Signal Listener",
        description: "You tuned into the analog world, reading continuous sensor voltages through the ADC.",
        iconPath: "/badges/signal-listener.svg",
    },
    {
        slug: "time-keeper",
        itemSlug: "lesson-6",
        title: "Time Keeper",
        description: "You mastered timers and interrupts, running code at precise intervals without blocking.",
        iconPath: "/badges/time-keeper.svg",
    },
    {
        slug: "serial-whisperer",
        itemSlug: "lesson-7",
        title: "Serial Whisperer",
        description: "You established UART communication, sending debug messages and data between devices.",
        iconPath: "/badges/serial-whisperer.svg",
    },
    {
        slug: "two-wire-talker",
        itemSlug: "lesson-8",
        title: "Two-Wire Talker",
        description: "You spoke I2C fluently, wiring up an OLED display and drawing pixels on screen.",
        iconPath: "/badges/two-wire-talker.svg",
    },
    {
        slug: "speed-chip",
        itemSlug: "lesson-9",
        title: "Speed Chip",
        description: "You conquered SPI for blazing-fast serial data transfers with peripherals.",
        iconPath: "/badges/speed-chip.svg",
    },
    {
        slug: "code-architect",
        itemSlug: "lesson-10",
        title: "Code Architect",
        description: "You structured multi-file C projects with headers and CMake like a professional developer.",
        iconPath: "/badges/code-architect.svg",
    },
    {
        slug: "pio-wizard",
        itemSlug: "lesson-11",
        title: "PIO Wizard",
        description: "You unlocked the Pico's PIO state machines — custom hardware protocols at your command.",
        iconPath: "/badges/pio-wizard.svg",
    },
    {
        slug: "dual-core-hero",
        itemSlug: "lesson-12",
        title: "Dual Core Hero",
        description: "You ran code on both Cortex-M33 cores simultaneously with safe inter-core communication.",
        iconPath: "/badges/dual-core-hero.svg",
    },
    {
        slug: "motor-commander",
        itemSlug: "lesson-13",
        title: "Motor Commander",
        description: "You took control of DC motors with an H-Bridge, spinning wheels forward and backward.",
        iconPath: "/badges/motor-commander.svg",
    },
    {
        slug: "angle-ace",
        itemSlug: "lesson-14",
        title: "Angle Ace",
        description: "You commanded servo motors to precise angles with perfectly timed PWM pulses.",
        iconPath: "/badges/angle-ace.svg",
    },
    {
        slug: "stepper-sage",
        itemSlug: "lesson-15",
        title: "Stepper Sage",
        description: "You mastered stepper motors, clicking through precise rotational steps with confidence.",
        iconPath: "/badges/stepper-sage.svg",
    },
    {
        slug: "distance-detective",
        itemSlug: "lesson-16",
        title: "Distance Detective",
        description: "You gave your robot eyes with ultrasonic and IR distance sensors to perceive the world.",
        iconPath: "/badges/distance-detective.svg",
    },
    {
        slug: "balance-brain",
        itemSlug: "lesson-17",
        title: "Balance Brain",
        description: "You decoded accelerometer and gyro data from an IMU to sense tilt and rotation.",
        iconPath: "/badges/balance-brain.svg",
    },
    {
        slug: "wireless-voyager",
        itemSlug: "lesson-18",
        title: "Wireless Voyager",
        description: "You connected the Pico 2 W to Wi-Fi and sent data across the network wirelessly.",
        iconPath: "/badges/wireless-voyager.svg",
    },
    {
        slug: "power-keeper",
        itemSlug: "lesson-19",
        title: "Power Keeper",
        description: "You designed efficient battery circuits and learned to conserve energy with sleep modes.",
        iconPath: "/badges/power-keeper.svg",
    },
    {
        slug: "system-thinker",
        itemSlug: "lesson-20",
        title: "System Thinker",
        description: "You designed a full robot architecture with task scheduling, state machines, and clean modules.",
        iconPath: "/badges/system-thinker.svg",
    },
];

export const projectBadges: BadgeDefinition[] = [
    {
        slug: "power-plant",
        itemSlug: "project-1",
        title: "Power Plant",
        description: "You built the power module that keeps your robot running strong on battery power.",
        iconPath: "/badges/power-plant.svg",
    },
    {
        slug: "brain-onboard",
        itemSlug: "project-2",
        title: "Brain Onboard",
        description: "You mounted the Pico on the chassis — your robot now has a brain!",
        iconPath: "/badges/brain-onboard.svg",
    },
    {
        slug: "driver-installed",
        itemSlug: "project-3",
        title: "Driver Installed",
        description: "You wired the motor driver board, connecting the muscles to the brain of your robot.",
        iconPath: "/badges/driver-installed.svg",
    },
    {
        slug: "first-roll",
        itemSlug: "project-4",
        title: "First Roll",
        description: "Your robot moved for the first time — forward, backward, and turning on command!",
        iconPath: "/badges/first-roll.svg",
    },
    {
        slug: "encoder-eyes",
        itemSlug: "project-5",
        title: "Encoder Eyes",
        description: "You added wheel encoders so your robot knows exactly how far it has traveled.",
        iconPath: "/badges/encoder-eyes.svg",
    },
    {
        slug: "smooth-operator",
        itemSlug: "project-6",
        title: "Smooth Operator",
        description: "You implemented PID speed control for buttery-smooth, consistent wheel speeds.",
        iconPath: "/badges/smooth-operator.svg",
    },
    {
        slug: "sonar-snout",
        itemSlug: "project-7",
        title: "Sonar Snout",
        description: "You gave your robot a front-facing ultrasonic eye to detect obstacles ahead.",
        iconPath: "/badges/sonar-snout.svg",
    },
    {
        slug: "obstacle-dodger",
        itemSlug: "project-8",
        title: "Obstacle Dodger",
        description: "Your robot navigates rooms autonomously, dodging walls and obstacles like a pro.",
        iconPath: "/badges/obstacle-dodger.svg",
    },
    {
        slug: "line-spotter",
        itemSlug: "project-9",
        title: "Line Spotter",
        description: "You installed IR sensors that let your robot see lines drawn on the ground.",
        iconPath: "/badges/line-spotter.svg",
    },
    {
        slug: "track-runner",
        itemSlug: "project-10",
        title: "Track Runner",
        description: "Your robot follows a line track smoothly using sensor feedback and PID control.",
        iconPath: "/badges/track-runner.svg",
    },
    {
        slug: "inner-compass",
        itemSlug: "project-11",
        title: "Inner Compass",
        description: "You mounted and calibrated the IMU, giving your robot a sense of balance and direction.",
        iconPath: "/badges/inner-compass.svg",
    },
    {
        slug: "true-heading",
        itemSlug: "project-12",
        title: "True Heading",
        description: "Your robot drives dead-straight and turns exact degrees with fused encoder and IMU data.",
        iconPath: "/badges/true-heading.svg",
    },
    {
        slug: "screen-on",
        itemSlug: "project-13",
        title: "Screen On",
        description: "You wired up an OLED display showing live status, speed, and sensor readings on the robot.",
        iconPath: "/badges/screen-on.svg",
    },
    {
        slug: "rainbow-rider",
        itemSlug: "project-14",
        title: "Rainbow Rider",
        description: "You added Neopixel LEDs driven by PIO for dazzling RGB animations on your robot.",
        iconPath: "/badges/rainbow-rider.svg",
    },
    {
        slug: "sound-effects",
        itemSlug: "project-15",
        title: "Sound Effects",
        description: "Your robot now beeps, chirps, and plays jingles through a piezo buzzer.",
        iconPath: "/badges/sound-effects.svg",
    },
    {
        slug: "mode-switch",
        itemSlug: "project-16",
        title: "Mode Switch",
        description: "You built a physical mode button with a state machine to switch between robot behaviors.",
        iconPath: "/badges/mode-switch.svg",
    },
    {
        slug: "radio-hands",
        itemSlug: "project-17",
        title: "Radio Hands",
        description: "You paired Bluetooth to your robot for wireless remote control from your phone.",
        iconPath: "/badges/radio-hands.svg",
    },
    {
        slug: "pocket-pilot",
        itemSlug: "project-18",
        title: "Pocket Pilot",
        description: "You hosted a Wi-Fi web joystick to drive your robot from any browser on the network.",
        iconPath: "/badges/pocket-pilot.svg",
    },
    {
        slug: "mission-monitor",
        itemSlug: "project-19",
        title: "Mission Monitor",
        description: "You built a live telemetry dashboard streaming real-time sensor data over Wi-Fi.",
        iconPath: "/badges/mission-monitor.svg",
    },
    {
        slug: "grand-roboticist",
        itemSlug: "project-20",
        title: "Grand Roboticist",
        description: "You completed every mission — your robot is fully autonomous. You are a Grand Roboticist!",
        iconPath: "/badges/grand-roboticist.svg",
    },
];

export const allBadges: BadgeDefinition[] = [...lessonBadges, ...projectBadges];
