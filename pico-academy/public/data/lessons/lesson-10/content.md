# C Projects, Headers & CMake

## What you'll learn
- How to organize code into multiple files with headers
- What header files are and why they matter
- How CMakeLists.txt builds your Pico projects
- How to create reusable libraries for your robot
- How to add the Pico SDK libraries your project needs

## Parts you'll need
- No additional parts needed — this is a software-only lesson

## Background

As your programs get bigger, stuffing everything into one giant file becomes a nightmare. Imagine keeping all your school subjects in one notebook with no dividers — you'd never find anything! In C, we split code into **modules**: each module has a `.c` file (the implementation) and a `.h` **header file** (the interface).

A header file is like a menu at a restaurant. It tells you what's available (function names, types, constants) without showing you the recipe (the actual code). When another file wants to use your functions, it `#include`s your header. The **include guard** (`#ifndef`/`#define`/`#endif`) at the top prevents the header from being included twice, which would cause errors.

**CMake** is the build system that turns your source code into a `.uf2` file the Pico can run. The `CMakeLists.txt` file is like a recipe card for the compiler — it lists which source files to compile, which Pico SDK libraries to link, and what the output should be called. The Pico SDK provides a helper called `pico_sdk_import.cmake` that sets everything up.

Every time you use a Pico feature (like PWM, I2C, or ADC), you need to tell CMake to link the matching library. If your code `#include`s `"hardware/pwm.h"`, your CMakeLists must have `hardware_pwm` in the `target_link_libraries` list. Miss one and you'll get scary linker errors!

## Wiring

No wiring needed for this lesson.

## The code

Here's how a well-organized project looks:

**Project structure:**
```
my_robot/
├── CMakeLists.txt
├── pico_sdk_import.cmake
├── main.c
├── motor.h
├── motor.c
├── sensor.h
└── sensor.c
```

**CMakeLists.txt:**
```c
cmake_minimum_required(VERSION 3.13)

# Pull in the Pico SDK
include(pico_sdk_import.cmake)

project(my_robot C CXX ASM)
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

# Initialize the Pico SDK
pico_sdk_init()

# Define the executable and its source files
add_executable(my_robot
    main.c
    motor.c
    sensor.c
)

# Link the Pico SDK libraries we need
target_link_libraries(my_robot
    pico_stdlib
    hardware_pwm
    hardware_adc
    hardware_i2c
    hardware_gpio
)

# Enable USB serial output and disable UART output
pico_enable_stdio_usb(my_robot 1)
pico_enable_stdio_uart(my_robot 0)

# Generate the UF2 file for flashing
pico_add_extra_outputs(my_robot)
```

**motor.h:**
```c
#ifndef MOTOR_H
#define MOTOR_H

#include <stdint.h>
#include <stdbool.h>

// Pin definitions for the motor driver
#define MOTOR_PWM_PIN   16
#define MOTOR_DIR_A_PIN 17
#define MOTOR_DIR_B_PIN 18

// Initialize the motor driver pins
void motor_init(void);

// Set motor speed: -100 to +100 (negative = reverse)
void motor_set_speed(int speed);

// Stop the motor (coast)
void motor_stop(void);

// Brake the motor (active braking)
void motor_brake(void);

#endif // MOTOR_H
```

**motor.c:**
```c
#include "motor.h"
#include "hardware/pwm.h"
#include "hardware/gpio.h"

static uint motor_slice;
static uint motor_channel;

void motor_init(void) {
    // Set up direction pins as digital outputs
    gpio_init(MOTOR_DIR_A_PIN);
    gpio_set_dir(MOTOR_DIR_A_PIN, GPIO_OUT);
    gpio_init(MOTOR_DIR_B_PIN);
    gpio_set_dir(MOTOR_DIR_B_PIN, GPIO_OUT);

    // Set up PWM pin
    gpio_set_function(MOTOR_PWM_PIN, GPIO_FUNC_PWM);
    motor_slice = pwm_gpio_to_slice_num(MOTOR_PWM_PIN);
    motor_channel = pwm_gpio_to_channel(MOTOR_PWM_PIN);

    pwm_set_wrap(motor_slice, 999);  // 0-999 = 1000 levels
    pwm_set_chan_level(motor_slice, motor_channel, 0);
    pwm_set_enabled(motor_slice, true);
}

void motor_set_speed(int speed) {
    // Clamp to -100..+100
    if (speed > 100) speed = 100;
    if (speed < -100) speed = -100;

    if (speed >= 0) {
        gpio_put(MOTOR_DIR_A_PIN, 1);
        gpio_put(MOTOR_DIR_B_PIN, 0);
    } else {
        gpio_put(MOTOR_DIR_A_PIN, 0);
        gpio_put(MOTOR_DIR_B_PIN, 1);
        speed = -speed;
    }

    uint16_t duty = (uint16_t)(speed * 999 / 100);
    pwm_set_chan_level(motor_slice, motor_channel, duty);
}

void motor_stop(void) {
    gpio_put(MOTOR_DIR_A_PIN, 0);
    gpio_put(MOTOR_DIR_B_PIN, 0);
    pwm_set_chan_level(motor_slice, motor_channel, 0);
}

void motor_brake(void) {
    gpio_put(MOTOR_DIR_A_PIN, 1);
    gpio_put(MOTOR_DIR_B_PIN, 1);
    pwm_set_chan_level(motor_slice, motor_channel, 999);
}
```

**main.c:**
```c
#include "pico/stdlib.h"
#include "motor.h"
#include <stdio.h>

int main() {
    stdio_init_all();
    motor_init();

    printf("Motor module test\n");

    while (true) {
        motor_set_speed(50);   // Forward at 50%
        sleep_ms(2000);
        motor_stop();
        sleep_ms(1000);
        motor_set_speed(-50);  // Reverse at 50%
        sleep_ms(2000);
        motor_brake();
        sleep_ms(1000);
    }

    return 0;
}
```

### How the code works

1. The **header file** (`motor.h`) declares what's available: constants, types, and function prototypes. The include guard prevents double-inclusion.
2. The **source file** (`motor.c`) contains the actual implementation. `static` variables are private to this file.
3. `main.c` includes `motor.h` and calls the functions — it doesn't need to know how they work internally.
4. `CMakeLists.txt` lists all `.c` files and the SDK libraries needed. The linker connects everything together.

## Try it

1. **Add a sensor module** — Create `sensor.h` and `sensor.c` that wrap ADC reading behind clean functions like `sensor_read_distance()`.
2. **Build locally** — Set up the Pico SDK on your computer and build this project using `mkdir build && cd build && cmake .. && make`.
3. **Conditional compilation** — Use `#ifdef DEBUG` to include extra debug prints that can be toggled on/off at build time.

## Challenge

Refactor one of your earlier lessons into a multi-file project with at least 3 modules: a main file, a hardware abstraction module, and a utility module. Write proper headers with include guards for each.

## Summary

Organizing C code into multiple files with headers makes your projects maintainable and reusable. Header files declare the interface with include guards, source files contain the implementation, and CMakeLists.txt ties everything together for the build system. Always list the Pico SDK libraries you use in `target_link_libraries`. This structure is how you'll build every robot project going forward!
