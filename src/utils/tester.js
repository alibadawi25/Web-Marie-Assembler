import { MarieSimulator } from "./marieSimulator.js";

const test_code = [4099, 24576, 28672, 12];

const simulator = MarieSimulator.getInstance(); // Use singleton instance
simulator.reset(); // Reset the simulator state before loading the program
simulator.loadProgram(test_code);

// console.log("Initial state:");
// console.log(simulator.getState());

// simulator.step(); // Execute the first instruction (LOAD)
// console.log("\nAfter LOAD:");
// console.log(simulator.getState());

// simulator.step(); // Execute the second instruction (OUTPUT)
// console.log("\nAfter OUTPUT:");
// console.log(simulator.getState());

// simulator.step(); // Execute the third instruction (HALT)
// console.log("\nAfter HALT:");
// console.log(simulator.getState());

simulator.run(test_code);
