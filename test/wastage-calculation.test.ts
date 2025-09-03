/**
 * Simple test script for wastage calculation functionality
 * This tests the core logic without requiring database connections
 */

import { wastageConfigService, WastageConfigService, DEFAULT_WASTAGE_CONFIG } from '../lib/wastage-config'

// Mock console methods for cleaner output
const originalConsole = { ...console }

console.log = (...args: any[]) => originalConsole.log('✅', ...args)
console.error = (...args: any[]) => originalConsole.error('❌', ...args)

// Test suite
function runTests() {
  console.log('Starting Wastage Calculation Tests...\n')

  // Test 1: Default configuration
  testDefaultConfiguration()

  // Test 2: Automatic wastage calculation
  testAutomaticWastageCalculation()

  // Test 3: Wastage validation
  testWastageValidation()

  // Test 4: Manual override scenarios
  testManualOverrideScenarios()

  console.log('\n🎉 All tests completed!')
}

function testDefaultConfiguration() {
  console.log('Test 1: Default Configuration')
  
  const config = DEFAULT_WASTAGE_CONFIG
  
  if (config.default_wastage_percentage === 8.0) {
    console.log('Default wastage percentage is 8%')
  } else {
    console.error('Expected default wastage percentage to be 8%')
  }

  if (config.max_wastage_percentage === 20.0) {
    console.log('Maximum wastage percentage is 20%')
  } else {
    console.error('Expected maximum wastage percentage to be 20%')
  }

  if (config.auto_calculate === true) {
    console.log('Auto-calculation is enabled by default')
  } else {
    console.error('Expected auto-calculation to be enabled by default')
  }
  
  console.log('')
}

function testAutomaticWastageCalculation() {
  console.log('Test 2: Automatic Wastage Calculation')
  
  const service = new WastageConfigService()
  
  // Test with default 8% wastage
  const cableLength = 100
  const expectedWastage = 8.0 // 8% of 100m
  const calculatedWastage = service.calculateWastage(cableLength, DEFAULT_WASTAGE_CONFIG)
  
  if (Math.abs(calculatedWastage - expectedWastage) < 0.01) {
    console.log(`100m cable → ${calculatedWastage}m wastage (8%)`)
  } else {
    console.error(`Expected ${expectedWastage}m wastage, got ${calculatedWastage}m`)
  }

  // Test with custom configuration
  const customConfig = {
    ...DEFAULT_WASTAGE_CONFIG,
    default_wastage_percentage: 10.0
  }
  
  const customWastage = service.calculateWastage(cableLength, customConfig)
  const expectedCustomWastage = 10.0 // 10% of 100m
  
  if (Math.abs(customWastage - expectedCustomWastage) < 0.01) {
    console.log(`100m cable with 10% config → ${customWastage}m wastage`)
  } else {
    console.error(`Expected ${expectedCustomWastage}m wastage, got ${customWastage}m`)
  }

  // Test with auto-calculation disabled
  const disabledConfig = {
    ...DEFAULT_WASTAGE_CONFIG,
    auto_calculate: false
  }
  
  const disabledWastage = service.calculateWastage(cableLength, disabledConfig)
  
  if (disabledWastage === 0) {
    console.log('Auto-calculation disabled → 0m wastage')
  } else {
    console.error(`Expected 0m wastage when disabled, got ${disabledWastage}m`)
  }
  
  console.log('')
}

function testWastageValidation() {
  console.log('Test 3: Wastage Validation')
  
  const service = new WastageConfigService()
  const cableLength = 100
  
  // Test valid wastage (within limits)
  const validWastage = 8.0 // 8% of 100m
  const validResult = service.validateWastage(validWastage, cableLength, DEFAULT_WASTAGE_CONFIG)
  
  if (validResult.isValid && validResult.percentage === 8.0) {
    console.log(`${validWastage}m wastage on ${cableLength}m cable → Valid (${validResult.percentage}%)`)
  } else {
    console.error('Expected valid wastage to pass validation')
  }

  // Test excessive wastage (over limits)
  const excessiveWastage = 25.0 // 25% of 100m (over 20% limit)
  const excessiveResult = service.validateWastage(excessiveWastage, cableLength, DEFAULT_WASTAGE_CONFIG)
  
  if (!excessiveResult.isValid && excessiveResult.percentage === 25.0) {
    console.log(`${excessiveWastage}m wastage on ${cableLength}m cable → Invalid (${excessiveResult.percentage}%)`)
    console.log(`Validation message: ${excessiveResult.message}`)
  } else {
    console.error('Expected excessive wastage to fail validation')
  }

  // Test edge case - exactly at limit
  const edgeWastage = 20.0 // 20% of 100m (exactly at limit)
  const edgeResult = service.validateWastage(edgeWastage, cableLength, DEFAULT_WASTAGE_CONFIG)
  
  if (edgeResult.isValid && edgeResult.percentage === 20.0) {
    console.log(`${edgeWastage}m wastage on ${cableLength}m cable → Valid (exactly at limit)`)
  } else {
    console.error('Expected wastage at exact limit to be valid')
  }
  
  console.log('')
}

function testManualOverrideScenarios() {
  console.log('Test 4: Manual Override Scenarios')
  
  const service = new WastageConfigService()
  
  // Scenario 1: Special installation requiring higher wastage
  const specialCableLength = 150
  const specialWastage = 18.0 // 12% wastage (higher than default 8%)
  
  const specialValidation = service.validateWastage(specialWastage, specialCableLength, DEFAULT_WASTAGE_CONFIG)
  
  if (specialValidation.isValid) {
    console.log(`Special case: ${specialWastage}m wastage on ${specialCableLength}m → Valid (${specialValidation.percentage.toFixed(1)}%)`)
  } else {
    console.error('Expected special case to be valid')
  }

  // Scenario 2: Efficient installation with lower wastage
  const efficientCableLength = 200
  const efficientWastage = 5.0 // 2.5% wastage (lower than default 8%)
  
  const efficientValidation = service.validateWastage(efficientWastage, efficientCableLength, DEFAULT_WASTAGE_CONFIG)
  
  if (efficientValidation.isValid) {
    console.log(`Efficient case: ${efficientWastage}m wastage on ${efficientCableLength}m → Valid (${efficientValidation.percentage.toFixed(1)}%)`)
  } else {
    console.error('Expected efficient case to be valid')
  }

  // Scenario 3: Total usage calculation
  const totalCable = 75
  const autoWastage = service.calculateWastage(totalCable, DEFAULT_WASTAGE_CONFIG)
  const totalUsage = totalCable + autoWastage
  
  console.log(`Total usage calculation: ${totalCable}m cable + ${autoWastage}m wastage = ${totalUsage}m total`)
  
  console.log('')
}

// Run the tests
runTests()

export { runTests }