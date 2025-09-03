/**
 * Standalone test script for wastage calculation functionality
 * This tests the core logic without any external dependencies
 */

// Default configuration
const DEFAULT_WASTAGE_CONFIG = {
  default_wastage_percentage: 8.0, // 8% default wastage
  max_wastage_percentage: 20.0, // 20% maximum allowable wastage
  auto_calculate: true,
}

// Standalone version of wastage calculation functions
function calculateWastage(totalCable, config) {
  const wastageConfig = config || DEFAULT_WASTAGE_CONFIG
  
  if (!wastageConfig.auto_calculate) {
    return 0
  }

  return (totalCable * wastageConfig.default_wastage_percentage) / 100
}

function validateWastage(wastageAmount, totalCable, config) {
  const wastageConfig = config || DEFAULT_WASTAGE_CONFIG
  const percentage = totalCable > 0 ? (wastageAmount / totalCable) * 100 : 0

  if (percentage > wastageConfig.max_wastage_percentage) {
    return {
      isValid: false,
      message: `Wastage (${percentage.toFixed(1)}%) exceeds maximum allowed (${wastageConfig.max_wastage_percentage}%)`,
      percentage,
    }
  }

  return {
    isValid: true,
    percentage,
  }
}

// Test suite
function runTests() {
  console.log('🧪 Starting Wastage Calculation Tests...\n')

  let testsPassed = 0
  let testsTotal = 0

  function test(name, testFn) {
    testsTotal++
    process.stdout.write(`${name}... `)
    
    try {
      if (testFn()) {
        console.log('✅ PASS')
        testsPassed++
      } else {
        console.log('❌ FAIL')
      }
    } catch (error) {
      console.log('❌ ERROR:', error)
    }
  }

  // Test 1: Default configuration
  test('Default configuration values', () => {
    return DEFAULT_WASTAGE_CONFIG.default_wastage_percentage === 8.0 &&
           DEFAULT_WASTAGE_CONFIG.max_wastage_percentage === 20.0 &&
           DEFAULT_WASTAGE_CONFIG.auto_calculate === true
  })

  // Test 2: Basic wastage calculation
  test('Basic wastage calculation (100m @ 8%)', () => {
    const result = calculateWastage(100, DEFAULT_WASTAGE_CONFIG)
    return Math.abs(result - 8.0) < 0.01
  })

  // Test 3: Custom percentage calculation
  test('Custom percentage calculation (100m @ 10%)', () => {
    const customConfig = { ...DEFAULT_WASTAGE_CONFIG, default_wastage_percentage: 10.0 }
    const result = calculateWastage(100, customConfig)
    return Math.abs(result - 10.0) < 0.01
  })

  // Test 4: Auto-calculation disabled
  test('Auto-calculation disabled returns 0', () => {
    const disabledConfig = { ...DEFAULT_WASTAGE_CONFIG, auto_calculate: false }
    const result = calculateWastage(100, disabledConfig)
    return result === 0
  })

  // Test 5: Valid wastage validation
  test('Valid wastage validation (8% of 100m)', () => {
    const result = validateWastage(8.0, 100, DEFAULT_WASTAGE_CONFIG)
    return result.isValid && Math.abs(result.percentage - 8.0) < 0.01
  })

  // Test 6: Excessive wastage validation
  test('Excessive wastage validation (25% of 100m)', () => {
    const result = validateWastage(25.0, 100, DEFAULT_WASTAGE_CONFIG)
    return !result.isValid && Math.abs(result.percentage - 25.0) < 0.01
  })

  // Test 7: Edge case - exactly at limit
  test('Edge case at maximum limit (20% of 100m)', () => {
    const result = validateWastage(20.0, 100, DEFAULT_WASTAGE_CONFIG)
    return result.isValid && Math.abs(result.percentage - 20.0) < 0.01
  })

  // Test 8: Real-world scenario 1
  test('Real-world: 75m cable with auto wastage', () => {
    const cableLength = 75
    const wastage = calculateWastage(cableLength, DEFAULT_WASTAGE_CONFIG)
    const total = cableLength + wastage
    const expectedTotal = 75 + 6.0 // 75 + (75 * 0.08)
    return Math.abs(total - expectedTotal) < 0.01
  })

  // Test 9: Real-world scenario 2
  test('Real-world: 150m cable with 12% manual override', () => {
    const cableLength = 150
    const manualWastage = 18.0 // 12% of 150
    const validation = validateWastage(manualWastage, cableLength, DEFAULT_WASTAGE_CONFIG)
    return validation.isValid && Math.abs(validation.percentage - 12.0) < 0.01
  })

  // Test 10: Zero cable length edge case
  test('Zero cable length edge case', () => {
    const wastage = calculateWastage(0, DEFAULT_WASTAGE_CONFIG)
    const validation = validateWastage(0, 0, DEFAULT_WASTAGE_CONFIG)
    return wastage === 0 && validation.isValid && validation.percentage === 0
  })

  console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`)
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed! Wastage calculation system is working correctly.')
    
    // Demo calculations
    console.log('\n📋 Example Calculations:')
    console.log(`• 50m cable → ${calculateWastage(50).toFixed(2)}m wastage → ${(50 + calculateWastage(50)).toFixed(2)}m total`)
    console.log(`• 100m cable → ${calculateWastage(100).toFixed(2)}m wastage → ${(100 + calculateWastage(100)).toFixed(2)}m total`)
    console.log(`• 200m cable → ${calculateWastage(200).toFixed(2)}m wastage → ${(200 + calculateWastage(200)).toFixed(2)}m total`)
    
    console.log('\n⚙️  Configuration:')
    console.log(`• Default wastage: ${DEFAULT_WASTAGE_CONFIG.default_wastage_percentage}%`)
    console.log(`• Maximum allowed: ${DEFAULT_WASTAGE_CONFIG.max_wastage_percentage}%`)
    console.log(`• Auto-calculation: ${DEFAULT_WASTAGE_CONFIG.auto_calculate ? 'Enabled' : 'Disabled'}`)
    
    return true
  } else {
    console.log('❌ Some tests failed. Please check the implementation.')
    return false
  }
}

// Run the tests
const success = runTests()
process.exit(success ? 0 : 1)