# UART Remote Control (Bluetooth HC-05)

## What you'll learn
- What UART (Universal Asynchronous Receiver/Transmitter) communication is
- How Bluetooth modules let you control the robot wirelessly from a phone
- How to receive and parse single-character commands
- How to wire the HC-05 module safely to the Pico 2
- How to build a simple command protocol for robot control

## Parts you'll need
- HC-05 Bluetooth module (~$5)

## Background

So far, our robot can only do things it's been programmed to do in advance. But what if you want to drive it around like an RC car, exploring your room in real time? That's where **Bluetooth** comes in! The HC-05 module gives our robot invisible wireless ears that can hear commands from your phone.

**UART** is one of the simplest ways two devices can talk to each other. It uses just two wires: TX (transmit) and RX (receive). The Pico sends data on its TX pin, and the HC-05 listens on its RX pin. The HC-05 sends data on its TX pin, and the Pico listens on its RX pin. Notice the crossover — TX connects to RX and RX connects to TX. It's like two people on walkie-talkies: one talks while the other listens.

The HC-05 handles all the complicated Bluetooth stuff (pairing, radio signals, encryption). From the Pico's perspective, it's just reading characters from a serial port. We'll use a super simple protocol: send a single letter to command the robot. **F** = forward, **B** = backward, **L** = left, **R** = right, **S** = stop. You can use any free Bluetooth serial terminal app on your phone.

Think of it like a TV remote: your phone sends single-letter instructions over Bluetooth to the HC-05, which converts them to UART signals that the Pico reads. The Pico then translates those letters into motor commands. Simple!

**Important safety note:** The HC-05's TX pin outputs 3.3V, which is safe for the Pico. But the HC-05's RX pin is not always 3.3V tolerant — we'll be safe since the Pico's TX is already 3.3V.

## Wiring

| HC-05 Pin | Pico 2 Pin | Notes |
|-----------|------------|-------|
| TXD       | GP1 (pin 2)  | HC-05 transmits → Pico UART0 RX |
| RXD       | GP0 (pin 1)  | Pico UART0 TX → HC-05 receives |
| VCC       | VBUS (pin 40) | 5V power for HC-05 |
| GND       | GND (pin 3)   | Ground |

> **Note:** The HC-05 needs 5V power but communicates at 3.3V logic levels. The Pico's GP0/GP1 are on UART0.

## The code

```c
#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/uart.h"
#include "hardware/pwm.h"

// UART configuration
#define BT_UART      uart0
#define BT_TX_PIN    0
#define BT_RX_PIN    1
#define BT_BAUD      9600

// Motor pins (from Project 4)
#define LEFT_FWD     2
#define LEFT_REV     3
#define RIGHT_FWD    6
#define RIGHT_REV    7

// Speed settings
#define DRIVE_SPEED  0.5f   // 50% power
#define TURN_SPEED   0.4f   // 40% power for turns

// --- Motor functions ---
void setup_motor_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 999);
    pwm_set_enabled(slice, true);
}

void set_motor(uint fwd_pin, uint rev_pin, float speed) {
    uint16_t duty = (uint16_t)(fabsf(speed) * 999);
    if (speed >= 0) {
        pwm_set_gpio_level(fwd_pin, duty);
        pwm_set_gpio_level(rev_pin, 0);
    } else {
        pwm_set_gpio_level(fwd_pin, 0);
        pwm_set_gpio_level(rev_pin, duty);
    }
}

void motors_stop(void) {
    set_motor(LEFT_FWD, LEFT_REV, 0);
    set_motor(RIGHT_FWD, RIGHT_REV, 0);
}

void drive_forward(void) {
    set_motor(LEFT_FWD, LEFT_REV, DRIVE_SPEED);
    set_motor(RIGHT_FWD, RIGHT_REV, DRIVE_SPEED);
}

void drive_backward(void) {
    set_motor(LEFT_FWD, LEFT_REV, -DRIVE_SPEED);
    set_motor(RIGHT_FWD, RIGHT_REV, -DRIVE_SPEED);
}

void turn_left(void) {
    set_motor(LEFT_FWD, LEFT_REV, -TURN_SPEED);
    set_motor(RIGHT_FWD, RIGHT_REV, TURN_SPEED);
}

void turn_right(void) {
    set_motor(LEFT_FWD, LEFT_REV, TURN_SPEED);
    set_motor(RIGHT_FWD, RIGHT_REV, -TURN_SPEED);
}

// --- Command processing ---
void process_command(char cmd) {
    switch (cmd) {
        case 'F': case 'f':
            printf("CMD: Forward\n");
            drive_forward();
            break;
        case 'B': case 'b':
            printf("CMD: Backward\n");
            drive_backward();
            break;
        case 'L': case 'l':
            printf("CMD: Left\n");
            turn_left();
            break;
        case 'R': case 'r':
            printf("CMD: Right\n");
            turn_right();
            break;
        case 'S': case 's':
            printf("CMD: Stop\n");
            motors_stop();
            break;
        case '1':
            printf("CMD: Speed LOW\n");
            // Could adjust DRIVE_SPEED variable
            break;
        case '2':
            printf("CMD: Speed MEDIUM\n");
            break;
        case '3':
            printf("CMD: Speed HIGH\n");
            break;
        case 'H': case 'h':
            // Horn! Quick beep
            printf("CMD: Horn!\n");
            break;
        default:
            printf("Unknown command: '%c' (0x%02X)\n", cmd, cmd);
            break;
    }
}

// Send a response back to the phone
void bt_send(const char *msg) {
    uart_puts(BT_UART, msg);
    uart_puts(BT_UART, "\r\n");
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // Initialize UART for Bluetooth
    uart_init(BT_UART, BT_BAUD);
    gpio_set_function(BT_TX_PIN, GPIO_FUNC_UART);
    gpio_set_function(BT_RX_PIN, GPIO_FUNC_UART);
    uart_set_format(BT_UART, 8, 1, UART_PARITY_NONE);
    uart_set_fifo_enabled(BT_UART, true);

    // Initialize motor pins
    setup_motor_pin(LEFT_FWD);
    setup_motor_pin(LEFT_REV);
    setup_motor_pin(RIGHT_FWD);
    setup_motor_pin(RIGHT_REV);

    printf("Bluetooth remote control ready!\n");
    printf("Waiting for connection on HC-05...\n");
    bt_send("PICO ROBOT READY");
    bt_send("Commands: F B L R S H 1 2 3");

    // Safety: start with motors stopped
    motors_stop();

    // Auto-stop timer: stop motors if no command in 500ms
    uint32_t last_cmd_time = 0;
    bool motors_running = false;

    while (true) {
        // Check for incoming Bluetooth data
        while (uart_is_readable(BT_UART)) {
            char c = uart_getc(BT_UART);

            // Ignore newlines and carriage returns
            if (c == '\n' || c == '\r') continue;

            process_command(c);
            last_cmd_time = to_ms_since_boot(get_absolute_time());
            motors_running = (c != 'S' && c != 's');

            // Echo acknowledgment back to phone
            char ack[32];
            snprintf(ack, sizeof(ack), "OK:%c", c);
            bt_send(ack);
        }

        // Safety auto-stop: if no command received for 500ms, stop
        if (motors_running) {
            uint32_t now = to_ms_since_boot(get_absolute_time());
            if (now - last_cmd_time > 500) {
                printf("Auto-stop: no command for 500ms\n");
                motors_stop();
                motors_running = false;
                bt_send("AUTO-STOP");
            }
        }

        sleep_ms(10);
    }

    return 0;
}
```

## Try it
- Download a Bluetooth serial terminal app (like "Serial Bluetooth Terminal" on Android)
- Pair with the HC-05 (default PIN is usually 1234) and send letter commands
- Add speed control: make '1' = slow (30%), '2' = medium (50%), '3' = fast (80%)
- Add a 'H' command that plays the buzzer horn sound from Project 15

## Challenge

Implement **variable speed control** with a two-character protocol. Instead of just "F" for forward, send "F7" to mean "forward at 70% speed." Parse the second character as a digit 0-9 and map it to motor speed. This gives you much finer control over the robot.

## Summary

UART is the simplest serial communication — just TX and RX wires carrying characters back and forth. The HC-05 Bluetooth module handles all the wireless complexity, so from the Pico's perspective it's just reading letters from a serial port. Our single-character command protocol is easy to use from any phone app. The safety auto-stop timer prevents the robot from driving forever if the Bluetooth connection drops.

## How this fits the robot

Bluetooth remote control is the REMOTE_CONTROL mode in our state machine from Project 16. When the button cycles to this mode, the robot starts listening for Bluetooth commands. It's also a great debugging tool — you can drive the robot around manually to test sensors and behaviors before making them autonomous.
