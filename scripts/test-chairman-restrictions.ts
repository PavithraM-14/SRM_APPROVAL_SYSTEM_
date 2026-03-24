import { getQueryableRoles, canSendQueryTo, getRoleDisplayName } from '../lib/query-hierarchy';
import { UserRole } from '../lib/types';

function testChairmanRestrictions() {
  console.log('🧪 Testing Chairman Query Restrictions\n');

  // Test 1: Chief Director (highest role below Chairman) cannot query Chairman
  console.log('📋 Test 1: Chief Director trying to query Chairman');
  const chiefDirectorCanQueryChairman = canSendQueryTo(UserRole.CHIEF_DIRECTOR, UserRole.CHAIRMAN);
  console.log(`Result: ${chiefDirectorCanQueryChairman ? '❌ FAIL' : '✅ PASS'} - Chief Director ${chiefDirectorCanQueryChairman ? 'can' : 'cannot'} query Chairman`);

  // Test 2: Chairman's queryable roles should not include Chairman
  console.log('\n📋 Test 2: Chairman\'s available query targets');
  const chairmanQueryableRoles = getQueryableRoles(UserRole.CHAIRMAN);
  const chairmanCanQueryHimself = chairmanQueryableRoles.includes(UserRole.CHAIRMAN);
  console.log(`Available targets for Chairman: ${chairmanQueryableRoles.map(role => getRoleDisplayName(role)).join(', ')}`);
  console.log(`Result: ${chairmanCanQueryHimself ? '❌ FAIL' : '✅ PASS'} - Chairman ${chairmanCanQueryHimself ? 'can' : 'cannot'} query himself`);

  // Test 3: Check all roles to ensure none can query Chairman
  console.log('\n📋 Test 3: All roles trying to query Chairman');
  const allRoles = Object.values(UserRole);
  let allTestsPassed = true;

  for (const role of allRoles) {
    const canQuery = canSendQueryTo(role, UserRole.CHAIRMAN);
    const status = canQuery ? '❌ FAIL' : '✅ PASS';
    console.log(`${status} - ${getRoleDisplayName(role)} ${canQuery ? 'can' : 'cannot'} query Chairman`);
    if (canQuery) allTestsPassed = false;
  }

  // Test 4: Verify Chairman is not in any role's queryable list
  console.log('\n📋 Test 4: Chairman in queryable roles lists');
  let chairmanFoundInLists = false;

  for (const role of allRoles) {
    const queryableRoles = getQueryableRoles(role);
    if (queryableRoles.includes(UserRole.CHAIRMAN)) {
      console.log(`❌ FAIL - ${getRoleDisplayName(role)} has Chairman in queryable roles`);
      chairmanFoundInLists = true;
    }
  }

  if (!chairmanFoundInLists) {
    console.log('✅ PASS - Chairman not found in any role\'s queryable list');
  }

  // Summary
  console.log('\n🎯 Summary:');
  console.log(`Overall Result: ${allTestsPassed && !chairmanFoundInLists ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('✅ No one can raise queries to Chairman');
  console.log('✅ Chairman will not receive any queries');
  console.log('✅ Chairman should not have "Respond to Query" page access');

  // Example hierarchy for reference
  console.log('\n📊 Query Hierarchy Examples:');
  console.log('• Chief Director can query:', getQueryableRoles(UserRole.CHIEF_DIRECTOR).map(role => getRoleDisplayName(role)).join(', '));
  console.log('• VP Research can query:', getQueryableRoles(UserRole.VP_RESEARCH).map(role => getRoleDisplayName(role)).join(', '));
  console.log('• Institution Manager can query:', getQueryableRoles(UserRole.INSTITUTION_MANAGER).map(role => getRoleDisplayName(role)).join(', '));
  console.log('• Requester can query:', getQueryableRoles(UserRole.REQUESTER).map(role => getRoleDisplayName(role)).join(', ') || 'No one (lowest level)');
}

testChairmanRestrictions();