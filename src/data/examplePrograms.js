export const EXAMPLE_PROGRAMS = [
  {
    id: 'echo',
    name: 'Echo',
    description: 'Read a number from input and print it back',
    difficulty: 'Beginner',
    code: `// Echo - read one value and output it
input        // AC <- user input
output       // OUT <- AC
halt         // stop`,
  },
  {
    id: 'add-two',
    name: 'Add Two Numbers',
    description: 'Read two numbers, add them, output the result',
    difficulty: 'Beginner',
    code: `// Add Two Numbers
input        // read first number
store  num1  // save it
input        // read second number
add    num1  // AC <- AC + num1
output       // print the sum
halt

num1, dec 0  // storage for first number`,
  },
  {
    id: 'multiply',
    name: 'Multiply',
    description: 'Multiply two numbers using repeated addition',
    difficulty: 'Intermediate',
    code: `// Multiply X * Y using repeated addition
// Result = X added Y times
input         // read X
store  x
input         // read Y (loop counter)
store  y

// loop: result += x, y times
loop,  load   result
add    x
store  result
load   y
subt   one
store  y
skipcond 400  // skip if y = 0
jump   loop

load   result
output        // print X * Y
halt

x,      dec 0
y,      dec 0
result, dec 0
one,    dec 1`,
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    description: 'Print the first 8 Fibonacci numbers',
    difficulty: 'Intermediate',
    code: `// Fibonacci - print first 8 terms: 0 1 1 2 3 5 8 13
       load   a
       output          // print 0
       load   b
       output          // print 1

loop,  load   a
       add    b
       store  tmp      // tmp = a + b
       output          // print next term
       load   b
       store  a        // a = b
       load   tmp
       store  b        // b = tmp
       load   count
       subt   one
       store  count
       skipcond 400    // stop when count = 0
       jump   loop
       halt

a,     dec 0
b,     dec 1
tmp,   dec 0
count, dec 6           // 6 more after the first 2
one,   dec 1`,
  },
  {
    id: 'factorial',
    name: 'Factorial',
    description: 'Compute N! (input N, output N factorial)',
    difficulty: 'Intermediate',
    code: `// Factorial - compute N!
// Input: N   Output: N!
       input
       store  n
       load   one
       store  result   // result = 1

loop,  load   n
       skipcond 400    // if n = 0, done
       jump   cont
       jump   done

cont,  load   result
       // multiply result * n (repeated addition)
       store  prod_a
       load   n
       store  prod_b
       load   zero
       store  acc

mloop, load   acc
       add    prod_a
       store  acc
       load   prod_b
       subt   one
       store  prod_b
       skipcond 400
       jump   mloop

       load   acc
       store  result
       load   n
       subt   one
       store  n
       jump   loop

done,  load   result
       output
       halt

n,      dec 0
result, dec 0
prod_a, dec 0
prod_b, dec 0
acc,    dec 0
zero,   dec 0
one,    dec 1`,
  },
  {
    id: 'gcd',
    name: 'GCD',
    description: 'Greatest Common Divisor using subtraction method',
    difficulty: 'Intermediate',
    code: `// GCD using repeated subtraction (Euclidean)
// Input: two positive integers   Output: GCD
       input
       store  a
       input
       store  b

loop,  load   a
       subt   b
       skipcond 000    // if a - b < 0, swap
       jump   pos
       // a < b: swap
       load   a
       store  tmp
       load   b
       store  a
       load   tmp
       store  b
       jump   loop

pos,   skipcond 400    // if a - b = 0, done
       jump   sub
       jump   done

sub,   store  a        // a = a - b (result of subt already in AC)
       jump   loop

done,  load   a
       output
       halt

a,   dec 0
b,   dec 0
tmp, dec 0`,
  },
  {
    id: 'count-down',
    name: 'Count Down',
    description: 'Count down from N to 1 and print each value',
    difficulty: 'Beginner',
    code: `// Count Down - input N, print N N-1 ... 1
       input
       store  n

loop,  load   n
       skipcond 400    // stop when n = 0
       jump   print
       jump   done

print, output          // print current n
       subt   one
       store  n
       jump   loop

done,  halt

n,   dec 0
one, dec 1`,
  },
  {
    id: 'max-two',
    name: 'Max of Two',
    description: 'Read two numbers, output the larger one',
    difficulty: 'Beginner',
    code: `// Max of Two - output the larger of two inputs
       input
       store  a
       input
       store  b

       load   a
       subt   b        // AC = a - b
       skipcond 800    // if a - b > 0 (a > b), jump to printa
       jump   printb
       jump   printa

printa, load  a
        output
        halt

printb, load  b
        output
        halt

a, dec 0
b, dec 0`,
  },
];
