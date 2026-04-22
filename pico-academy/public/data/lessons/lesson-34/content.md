# Lesson 34: IR Transmitter Module — Send Secret Invisible Messages!

## 🎯 What You'll Learn
- How an IR transmitter sends invisible infrared signals
- What the NEC protocol is (how TV remotes talk to your TV)
- How to modulate a signal at 38kHz (the magic frequency!)
- How to send remote control commands from your Pico
- How to build your own TV remote (sort of!)

---

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W (~$6)
- IR Transmitter Module from Elegoo kit
- IR Receiver Module (from earlier lessons — to verify your signals!)
- LED (any color) for visual confirmation
- Breadboard and jumper wires
- USB cable for power and serial output

---

## 🌟 Background

Every time you press a button on your TV remote, it sends a secret message using INVISIBLE light! The remote has a small LED that flashes infrared light (IR light — just beyond the red end of the rainbow that humans cannot see). Your TV has an IR receiver that picks up those flashes and decodes them into commands like "volume up" or "change channel." In Lesson 11 you used the IR receiver to READ these messages. Now you are going to SEND them!

The clever trick is **38kHz modulation**. IR remotes do not just turn the LED on and off slowly. Instead, when they want to send a "1" or "0", they flash the LED on and off 38,000 times per second! A regular TV can ignore a steady IR glow (sunlight has some IR in it too), but the receiver is tuned specifically to detect signals flickering at 38kHz. It is like having a secret knock pattern that only your friend recognizes — 38,000 knocks per second!

The protocol most commonly used is called **NEC** (named after a company). In NEC format, you start with a long "attention!" burst (9ms of IR flashes followed by 4.5ms of silence), then you send your address (which device to control) and command (which button was pressed) as pulses. Each bit is represented by a short burst followed by a short or long silence. Learning to send NEC commands means your Pico can control any device that uses a TV remote — TVs, air conditioners, media players, and more!

---

## 🔌 Wiring

| Pico 2 W Pin | Module Pin | Notes |
|---|---|---|
| GP14 | S (signal) | IR LED signal input |
| 3V3 | VCC | Power |
| GND | GND | Ground |

> **To verify:** Connect your IR receiver module (from earlier lessons) to GP15 and watch for received signals on serial output while transmitting.

---

## 💻 The Code

```c
/**
 * Lesson 34: IR Transmitter Module
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * We implement the NEC IR protocol manually.
 * NEC uses 38kHz carrier frequency.
 * Each bit: short burst = 1, long burst = 0
 * (actually controlled by the gap length, not the burst length)
 *
 * NEC Protocol timing:
 *   Leader:  9000us ON, 4500us OFF
 *   Bit 1:    562us ON, 1687us OFF
 *   Bit 0:    562us ON,  562us OFF
 *   Stop bit: 562us ON
 */

#include <stdio.h>          // For printf()
#include "pico/stdlib.h"    // Main Pico SDK
#include "hardware/pwm.h"   // PWM for 38kHz carrier

// Pin for IR transmitter
#define IR_PIN  14   // GP14 — IR LED signal pin

// NEC protocol timing in microseconds
#define NEC_LEADER_ON    9000   // Leader burst: 9ms ON
#define NEC_LEADER_OFF   4500   // Leader gap: 4.5ms OFF
#define NEC_BIT_ON        562   // Every bit starts with 562us ON
#define NEC_BIT_ONE_OFF  1687   // Bit "1" gap: 1687us OFF
#define NEC_BIT_ZERO_OFF  562   // Bit "0" gap: 562us OFF
#define NEC_STOP          562   // Stop bit: 562us ON

// Send the 38kHz carrier for a specified duration in microseconds
// This flashes the IR LED at 38kHz for the given time
void ir_burst(uint32_t duration_us) {
    // 38kHz means the period is 1,000,000 / 38,000 = ~26.3 microseconds
    // Half period = ~13 microseconds on, ~13 microseconds off
    uint32_t half_period_us = 13;

    uint32_t elapsed = 0;
    while (elapsed < duration_us) {
        gpio_put(IR_PIN, 1);          // LED ON
        sleep_us(half_period_us);     // On for half period
        gpio_put(IR_PIN, 0);          // LED OFF
        sleep_us(half_period_us);     // Off for half period
        elapsed += half_period_us * 2; // Count full period elapsed
    }
}

// Send silence (IR LED off) for a specified duration in microseconds
void ir_silence(uint32_t duration_us) {
    gpio_put(IR_PIN, 0);    // LED off
    sleep_us(duration_us);  // Wait for duration
}

// Send a single NEC bit (0 or 1)
void nec_send_bit(bool bit) {
    ir_burst(NEC_BIT_ON);                          // All bits start with burst
    if (bit) {
        ir_silence(NEC_BIT_ONE_OFF);   // Long gap = 1
    } else {
        ir_silence(NEC_BIT_ZERO_OFF);  // Short gap = 0
    }
}

// Send a full NEC frame: address, ~address, command, ~command
// The NEC protocol sends each byte twice — once normal, once inverted
// This helps the receiver check the data was received correctly (error checking!)
void nec_send(uint8_t address, uint8_t command) {
    printf("Sending NEC: address=0x%02X, command=0x%02X\n", address, command);

    // Step 1: Send the leader burst (9ms ON, 4.5ms OFF)
    ir_burst(NEC_LEADER_ON);
    ir_silence(NEC_LEADER_OFF);

    // Step 2: Send the address byte (8 bits, LSB first)
    for (int i = 0; i < 8; i++) {
        nec_send_bit(address & (1 << i));   // Send bit i of address
    }

    // Step 3: Send the inverted address byte (~address)
    uint8_t inv_address = ~address;         // Bitwise NOT = invert all bits
    for (int i = 0; i < 8; i++) {
        nec_send_bit(inv_address & (1 << i));
    }

    // Step 4: Send the command byte (8 bits, LSB first)
    for (int i = 0; i < 8; i++) {
        nec_send_bit(command & (1 << i));   // Send bit i of command
    }

    // Step 5: Send the inverted command byte (~command)
    uint8_t inv_command = ~command;
    for (int i = 0; i < 8; i++) {
        nec_send_bit(inv_command & (1 << i));
    }

    // Step 6: Send stop bit
    ir_burst(NEC_STOP);

    printf("  -> Sent!\n");
}

int main() {
    stdio_init_all();   // Start USB serial
    sleep_ms(2000);     // Wait for serial

    printf("=== Lesson 34: IR Transmitter Module ===\n");
    printf("Sending NEC IR signals!\n");
    printf("Point this at your TV or IR receiver to test!\n\n");

    // Set up IR transmitter pin as output
    gpio_init(IR_PIN);
    gpio_set_dir(IR_PIN, GPIO_OUT);
    gpio_put(IR_PIN, 0);   // Start with IR LED off

    // Common NEC codes for Samsung TVs (your TV may differ)
    // Address 0xE0 = Samsung TV device address
    // These are common Samsung remote commands
    printf("Sending TV remote codes every 5 seconds!\n");
    printf("(Point at your TV or IR receiver to see the effect)\n\n");

    // Example NEC addresses and commands
    // Samsung TV: address = 0x07, power = 0x02
    // Generic example codes:
    uint8_t my_address = 0x00;    // Device address (0x00 = generic)
    uint8_t commands[] = {
        0x45,   // Button 1 / Power on many remotes
        0x46,   // Button 2
        0x47,   // Button 3
        0x44,   // Button 4
        0x40,   // Button 5
        0x43,   // Button 6
        0x07,   // Button 7
        0x15,   // Button 8
        0x09,   // Button 9
        0x19,   // Button 0
    };

    int num_commands = 10;

    while (true) {

        for (int i = 0; i < num_commands; i++) {
            printf("Sending command 0x%02X (button %d)...\n",
                   commands[i], i);

            // Send the NEC command 3 times (most remotes do this for reliability)
            for (int repeat = 0; repeat < 3; repeat++) {
                nec_send(my_address, commands[i]);
                sleep_ms(40);   // Short pause between repeat transmissions
            }

            printf("Done! Waiting 3 seconds...\n\n");
            sleep_ms(3000);   // Wait before sending next command
        }

        printf("--- All commands sent, starting again ---\n\n");
        sleep_ms(2000);
    }

    return 0;
}
```

---

## 🔍 How the Code Works

1. **38kHz carrier:** The `ir_burst()` function switches the IR LED on and off every 13 microseconds. That is 1,000,000 / 26 = about 38,461 times per second — very close to 38kHz! IR receivers are tuned to this frequency.

2. **NEC leader:** Every NEC message starts with 9ms of carrier followed by 4.5ms of silence. This is the "attention!" signal that wakes up the receiver and says "a message is coming!"

3. **Bit encoding:** In NEC, every bit starts with a 562us burst. A long gap (1687us) means "1". A short gap (562us) means "0". The gap length encodes the bit value!

4. **Inverted bytes:** The protocol sends each byte TWICE — once normally, once with all bits flipped. The receiver checks they are opposites to catch any transmission errors. It is like sending your message and then sending its mirror image!

5. **LSB first:** The bits are sent from the least significant bit (bit 0) to the most significant (bit 7). This is just the NEC standard — always check the protocol spec when implementing communication protocols.

---

## 🎮 Try It!

1. **IR receiver test:** Connect your IR receiver module to GP15. Can you see the signals arriving when you transmit?

2. **TV test:** Point the transmitter at your TV (try from 1 meter away). Do any of the commands trigger a response?

3. **Look at the light:** Point your phone camera at the IR LED while it is transmitting. Phone cameras can see IR! You should see the LED flickering in the camera view.

4. **Change address:** Try sending with address `0x07` (common Samsung address) and see if your Samsung TV responds!

---

## 🏆 Challenge

**Decode a real remote and replay it!** Use your IR receiver from Lesson 11 to record the exact NEC codes sent by one button on a real remote (write down the address and command bytes from the serial output). Then program your transmitter to send that exact same code. If your code matches perfectly, the device should respond to your Pico just like it responds to the real remote!

---

## 📝 Summary

The IR transmitter sends invisible infrared light pulses using the NEC protocol — a standard format used by most TV remotes worldwide. By modulating the IR LED at 38kHz and timing the gaps precisely, you can encode any address and command combination. The NEC protocol sends each byte twice (once normal, once inverted) for error checking. With this knowledge, your Pico can send remote control commands to televisions, air conditioners, and any other IR-controlled device!
