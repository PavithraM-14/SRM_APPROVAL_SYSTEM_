import { getQueryableRoles, canSendQueryTo, getRoleDisplayName } from '../lib/query-hierarchy';
import { UserRole } from '../lib/types';

function verifyQueryLogic() {
  console.log('🧪 QUERY SYSTEM VERIFICATION\n');

  // Test all key scenarios
  const testScenarios = [
    {
      role: UserRole.VP_RESEARCH,
      description: 'VP Research Query Targets',
      expectedTargets: [UserRole.REQUESTER, UserRole.INSTITUTION_MANAGER, UserRole.ACCOUNTANT],
      shouldNotTarget: [UserRole.VP_RESEARCH, UserRole.VP_ACADEMIC, UserRole.CHAIRMAN, UserRole.DEAN]
    },
    {
      role: UserRole.INSTITUTION_MANAGER,
      description: 'Institution Manager Query Targets',
      expectedTargets: [UserRole.REQUESTER, UserRole.ACCOUNTANT],
      shouldNotTarget: [UserRole.INSTITUTION_MANAGER, UserRole.VP_RESEARCH, UserRole.CHAIRMAN]
    },
    {
      role: UserRole.ACCOUNTANT,
      description: 'Accountant Query Targets',
      expectedTargets: [UserRole.REQUESTER],
      shouldNotTarget: [UserRole.ACCOUNTANT, UserRole.INSTITUTION_MANAGER, UserRole.VP_RESEARCH, UserRole.CHAIRMAN]
    },
    {
      role: UserRole.CHIEF_DIRECTOR,
      description: 'Chief Director Query Targets',
      expectedTargets: [UserRole.REQUESTER, UserRole.INSTITUTION_MANAGER, UserRole.ACCOUNTANT, UserRole.VP_RESEARCH, UserRole.VP_ACADEMIC, UserRole.VP_ADMIN, UserRole.RESEARCH_DIRECTOR, UserRole.HEAD_OF_INSTITUTION, UserRole.DEAN, UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT],
      shouldNotTarget: [UserRole.CHIEF_DIRECTOR, UserRole.CHAIRMAN]
    },
    {
      role: UserRole.REQUESTER,
      description: 'Requester Query Targets',
      expectedTargets: [],
      shouldNotTarget: [UserRole.REQUESTER, UserRole.INSTITUTION_MANAGER, UserRole.CHAIRMAN]
    }
  ];

  let allTestsPassed = true;

  for (const scenario of testScenarios) {
    console.log(`📋 Testing: ${scenario.description}`);
    console.log(`👤 Role: ${getRoleDisplayName(scenario.role)}\n`);

    // Get actual queryable roles
    const actualTargets = getQueryableRoles(scenario.role);
    
    console.log(`✅ Can query (${actualTargets.length}): ${actualTargets.map(role => getRoleDisplayName(role)).join(', ') || 'None'}`);

    // Test expected targets
    for (const expectedTarget of scenario.expectedTargets) {
      const canQuery = actualTargets.includes(expectedTarget);
      const canQueryDirect = canSendQueryTo(scenario.role, expectedTarget);
      
      if (canQuery && canQueryDirect) {
        console.log(`  ✅ Can query ${getRoleDisplayName(expectedTarget)}`);
      } else {
        console.log(`  ❌ FAIL: Should be able to query ${getRoleDisplayName(expectedTarget)}`);
        allTestsPassed = false;
      }
    }

    // Test roles that should NOT be queryable
    for (const shouldNotTarget of scenario.shouldNotTarget) {
      const canQuery = actualTargets.includes(shouldNotTarget);
      const canQueryDirect = canSendQueryTo(scenario.role, shouldNotTarget);
      
      if (!canQuery && !canQueryDirect) {
        console.log(`  ✅ Cannot query ${getRoleDisplayName(shouldNotTarget)}`);
      } else {
        console.log(`  ❌ FAIL: Should NOT be able to query ${getRoleDisplayName(shouldNotTarget)}`);
        allTestsPassed = false;
      }
    }

    console.log('');
  }

  // Special Chairman tests
  console.log('🔒 CHAIRMAN PROTECTION TESTS\n');
  
  const allRoles = Object.values(UserRole);
  let chairmanProtected = true;

  for (const role of allRoles) {
    const canQueryChairman = canSendQueryTo(role, UserRole.CHAIRMAN);
    const queryableRoles = getQueryableRoles(role);
    const chairmanInList = queryableRoles.includes(UserRole.CHAIRMAN);

    if (canQueryChairman || chairmanInList) {
      console.log(`❌ FAIL: ${getRoleDisplayName(role)} can query Chairman`);
      chairmanProtected = false;
    } else {
      console.log(`✅ ${getRoleDisplayName(role)} cannot query Chairman`);
    }
  }

  // Summary
  console.log('\n🎯 VERIFICATION SUMMARY\n');
  
  if (allTestsPassed && chairmanProtected) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Hierarchical query system working correctly');
    console.log('✅ Chairman protection implemented properly');
    console.log('✅ All role restrictions enforced');
  } else {
    console.log('❌ SOME TESTS FAILED!');
    console.log('Please check the implementation');
  }

  console.log('\n📊 QUERY HIERARCHY SUMMARY:');
  console.log('• VP Research → Institution Manager, Accountant, Requester');
  console.log('• Institution Manager → Requester');
  console.log('• Accountant → Requester');
  console.log('• Chief Director → Everyone except Chairman');
  console.log('• Chairman → Everyone (but no one can query Chairman)');
  console.log('• Requester → No one (lowest level)');

  console.log('\n🚀 READY FOR MANUAL TESTING!');
  console.log('Use the QUERY_FLOW_TEST_GUIDE.md for step-by-step testing');
}

verifyQueryLogic();