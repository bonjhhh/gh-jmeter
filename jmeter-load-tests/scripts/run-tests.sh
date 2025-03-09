#!/bin/bash

# Navigate to the JMeter directory
cd jmeter

# Run the UI load test
jmeter -n -t tests/testPlan01.jmx -l results/testPlan01-results.jtl

# Exit the script
exit 0