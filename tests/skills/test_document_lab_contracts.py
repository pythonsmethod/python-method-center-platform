"""New synthetic contract regressions only. No application imports or fixtures."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
SKILLS = ROOT / '.agents' / 'skills'


def load(name, script):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), SKILLS / name / 'scripts' / script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


doc = load('document-analysis', 'validate_package.py')
lab = load('lab-analysis', 'validate_comparison.py')


def example(name):
    return json.loads((SKILLS / name / 'references' / 'synthetic-example.json').read_text())


class DocumentContractTests(unittest.TestCase):
    def setUp(self):
        self.p = example('document-analysis')
        self.f = self.p['findings'][0]

    def rejected(self, code):
        self.assertIn(code, [e['code'] for e in doc.validate(self.p)])

    def test_literal_ambiguous_unsaved_example(self):
        self.assertEqual(doc.validate(self.p), [])

    def test_missing_page_cannot_be_complete(self):
        self.p['reading']['expected_pages'] = 2
        self.rejected('INCOMPLETE_COVERAGE')

    def test_unreadable_region_cannot_be_complete(self):
        self.p['reading']['coverage_issues'] = ['UNREADABLE_CELL']
        self.rejected('INCOMPLETE_COVERAGE')

    def test_no_finding_identity(self):
        del self.f['finding_id']
        self.rejected('FINDING_ID_REQUIRED')

    def test_source_revision_mismatch(self):
        self.f['source_version'] = 'synthetic:v2'
        self.rejected('SOURCE_VERSION_MISMATCH')

    def test_foreign_anchor(self):
        self.f['anchors'][0]['document_id'] = 'synthetic:other-person-doc'
        self.rejected('ANCHOR_SOURCE_MISMATCH')

    def test_exact_token_claim_without_tokens(self):
        self.f['anchors'][0]['provenance_level'] = 'P4'
        self.rejected('TOKEN_PROVENANCE_REQUIRED')

    def test_ambiguous_date_not_normalized(self):
        self.f['dates'][0]['normalized'] = '2026-09-10'
        self.rejected('DATE_NOT_ESTABLISHED')

    def test_ambiguity_flag_cannot_hide_printed_ambiguity(self):
        self.f['dates'][0].update(normalized='2026-09-10',ambiguous=False)
        self.rejected('AMBIGUOUS_PRINTED_DATE')

    def test_unambiguous_printed_date_cannot_change(self):
        self.f['dates'][0].update(original='23/09/2026',normalized='2026-09-24',ambiguous=False)
        self.rejected('PRINTED_DATE_MISMATCH')

    def test_invalid_calendar_date(self):
        self.f['dates'][0].update(original='2026-02-30',normalized='2026-02-30',ambiguous=False)
        self.rejected('DATE_NOT_ESTABLISHED')

    def test_missing_value_not_zero(self):
        self.f['fields'][3]['parsed'] = 0
        self.rejected('MISSING_VALUE_INVENTED')

    def test_bound_not_exact_number(self):
        self.f['fields'][1].update(original='<5', parsed={'kind':'EXACT','decimal':'5'})
        self.rejected('NONEXACT_COERCION')

    def test_censored_result_preserved(self):
        self.f['fields'][1].update(original='<5', parsed={'kind':'CENSORED','comparator':'<','bound':'5'})
        self.assertEqual(doc.validate(self.p), [])

    def test_censored_sign_cannot_flip(self):
        self.f['fields'][1].update(original='≤5',parsed={'kind':'CENSORED','comparator':'>=','bound':'5'})
        self.rejected('COMPARATOR_CHANGED')

    def test_range_not_midpoint(self):
        self.f['fields'][1].update(original='3–5',parsed={'kind':'EXACT','decimal':'4'})
        self.rejected('NONEXACT_COERCION')

    def test_qualitative_not_zero(self):
        self.f['fields'][1].update(original='не обнаружено', parsed={'kind':'EXACT','decimal':'0'})
        self.rejected('NONEXACT_COERCION')

    def test_normalization_requires_rule(self):
        self.f['fields'][2]['normalized'] = {'value':'g/L','rule_id':None,'rule_version':None}
        self.rejected('NORMALIZATION_RULE_REQUIRED')

    def test_shadow_decision_not_verified(self):
        self.f['trust'].update(state='VERIFIED',decision_id='synthetic:d1',policy_version='p1')
        self.rejected('VERIFIED_BINDING_REQUIRED')

    def test_stale_decision_not_verified(self):
        self.f['trust'].update(state='VERIFIED',decision_id='synthetic:d1',policy_version='p1',shadow_only=False,bound_source_version='synthetic:old')
        self.rejected('VERIFIED_BINDING_REQUIRED')

    def test_saved_without_readback(self):
        self.p['execution_mode'] = 'LIVE'
        self.p['persistence'].update(status='SAVED',snapshot_id='s1',receipt_id='r1',idempotency_key='k1')
        self.rejected('SAVE_NOT_CONFIRMED')

    def test_simulation_cannot_save(self):
        self.p['persistence'].update(status='SAVED',snapshot_id='s1',receipt_id='r1',idempotency_key='k1',readback_confirmed=True)
        self.rejected('SAVE_NOT_CONFIRMED')

    def test_failed_save_stays_unsaved(self):
        self.p['persistence'].update(status='FAILED',error_code='WRITE_FAILED')
        self.assertEqual(doc.validate(self.p), [])

    def test_lost_review_item(self):
        self.p['review_queue'].update(items=[],total=0,shown=0)
        self.rejected('REVIEW_ITEM_LOST')

    def test_missing_page_no_facts_still_needs_review(self):
        self.p.update(findings=[],summary=[])
        self.p['reading'].update(status='PARTIAL',expected_pages=2,
          pages=[{'page':1,'state':'READ','issue_codes':[]},{'page':2,'state':'MISSING','issue_codes':['MISSING_PAGE']}])
        self.p['review_queue'].update(items=[],total=0,shown=0)
        self.rejected('COVERAGE_REVIEW_LOST')

    def test_failed_reading_cannot_have_successful_findings(self):
        self.p['reading']['status']='FAILED'
        self.rejected('FAILED_READING_HAS_RESULTS')

    def test_overflow_without_cursor_cannot_claim_complete_delivery(self):
        self.p['review_queue']['total'] = 100
        self.rejected('QUEUE_TRUNCATED_WITHOUT_CONTINUATION')

    def test_partial_delivery_is_honest(self):
        self.p['review_queue'].update(total=100,delivery_complete=False)
        self.assertEqual(doc.validate(self.p), [])

    def test_duplicate_id_not_new_observation(self):
        self.p['findings'].append(copy.deepcopy(self.f))
        self.rejected('DUPLICATE_FINDING')

    def test_unbound_summary(self):
        self.p['summary'][0]['finding_ids'] = ['invented']
        self.rejected('SUMMARY_SOURCE_REQUIRED')

    def test_denied_authorization_has_no_clinical_payload(self):
        blocked={'contract_version':'document-analysis/2','execution_mode':'LIVE','outcome':'BLOCKED',
                 'errors':[{'code':'AUTHORIZATION_UNAVAILABLE','retryable':False}]}
        self.assertEqual(doc.validate(blocked), [])
        blocked['findings'] = [self.f]
        self.assertIn('UNKNOWN_FIELD',[e['code'] for e in doc.validate(blocked)])

    def test_malformed_containers_fail_without_exception(self):
        for key in ('context','run','reading','findings','persistence','review_queue','summary'):
            for bad in (None,42,[], 'untrusted'):
                if key == 'summary' and bad == []:
                    continue  # An omitted narrative is valid; evidence is still present.
                p=example('document-analysis')
                p[key]=bad
                with self.subTest(key=key,bad=bad):
                    self.assertTrue(doc.validate(p))


class ComparisonContractTests(unittest.TestCase):
    def setUp(self):
        self.p = example('lab-analysis')

    def rejected(self, code):
        self.assertIn(code,[e['code'] for e in lab.validate(self.p)])

    def verified(self):
        self.p.update(result='STABLE',trust_eligible=True,
                      rule={'id':'synthetic:stable-rule','version':'1','supports_result_kinds':['EXACT']})
        for side in (self.p['left'],self.p['right']):
            side.update(trust_state='VERIFIED',decision_id='synthetic:decision-'+side['finding_id'],
                        decision_finding_id=side['finding_id'],decision_snapshot_id=side['snapshot_id'],
                        decision_source_version=side['source_version'],decision_shadow_only=False)

    def test_exact_decimal_potential_change(self):
        self.assertEqual(lab.validate(self.p), [])

    def test_unknown_units_never_potential_change(self):
        self.p['compatibility']['units'].update(state='UNKNOWN',reason='MISSING_UNIT')
        self.rejected('COMPATIBILITY_REQUIRED')

    def test_units_cannot_be_not_applicable(self):
        self.p['compatibility']['units'].update(state='NOT_APPLICABLE',rule_id='invented')
        self.rejected('UNSUPPORTED_NOT_APPLICABLE')

    def test_date_kind_mismatch(self):
        self.p['right']['event_date_kind'] = 'report'
        self.rejected('DATE_KIND_MISMATCH')

    def test_unknown_event_date(self):
        self.p['left']['event_date'] = None
        self.rejected('TIME_ORDER_NOT_ESTABLISHED')

    def test_duplicate_observation(self):
        self.p['right']['finding_id'] = self.p['left']['finding_id']
        self.rejected('DUPLICATE_OBSERVATION')

    def test_rejected_evidence_excluded(self):
        self.p['left'].update(trust_state='REJECTED',exclusion_reasons=['BAD_SOURCE'])
        self.rejected('EXCLUDED_EVIDENCE')

    def test_no_baseline_not_stable(self):
        self.p.update(left=None,result='STABLE',delta=None)
        self.rejected('BASELINE_MISSING')

    def test_no_baseline_honest_result(self):
        self.p.update(left=None,result='NO_BASELINE',delta=None,reason_codes=['NO_PRIOR_OBSERVATION'])
        self.assertEqual(lab.validate(self.p), [])

    def test_shadow_verification_not_factual_change(self):
        self.verified()
        self.p['right']['decision_shadow_only'] = True
        self.rejected('VERIFIED_BINDING_REQUIRED')

    def test_stale_verification(self):
        self.verified()
        self.p['right']['decision_source_version'] = 'old'
        self.rejected('VERIFIED_BINDING_REQUIRED')

    def test_another_fact_decision_cannot_be_reused(self):
        self.verified()
        self.p['right']['decision_finding_id']=self.p['left']['finding_id']
        self.rejected('VERIFIED_BINDING_REQUIRED')

    def test_old_snapshot_decision_cannot_be_reused(self):
        self.verified()
        self.p['right']['decision_snapshot_id']='synthetic:old-snapshot'
        self.rejected('VERIFIED_BINDING_REQUIRED')

    def test_equal_review_only_is_not_potential_change(self):
        self.p['right']['exact_decimal']=self.p['left']['exact_decimal']
        self.p['delta']='0'
        self.rejected('NO_DIRECTIONAL_CHANGE')

    def test_stable_requires_rule(self):
        self.verified()
        self.p['rule'] = None
        self.rejected('RULE_AND_ELIGIBILITY_REQUIRED')

    def test_conflict_not_factual_change(self):
        self.verified()
        self.p['contradictions'] = ['SOURCE_CONFLICT']
        self.rejected('CONTRADICTION_UNRESOLVED')

    def test_censored_bound_not_exact_delta(self):
        self.p['left'].update(result_kind='CENSORED',exact_decimal=None)
        self.rejected('DELTA_NOT_ALLOWED')

    def test_wrong_decimal_arithmetic(self):
        self.p['delta'] = '0.100000000000001'
        self.rejected('DELTA_ARITHMETIC')

    def test_nan_not_decimal(self):
        self.p['left']['exact_decimal'] = 'NaN'
        self.rejected('DECIMAL_REQUIRED')

    def test_mismatched_units_need_conversion(self):
        self.p['right']['unit'] = 'g/L'
        self.rejected('CONVERSION_RULE_REQUIRED')

    def test_relative_change_on_zero_not_emitted(self):
        self.p['left']['exact_decimal'] = '0'
        self.p.update(delta='10.2',relative_delta='Infinity')
        self.rejected('RELATIVE_DELTA_EXTENSION_REQUIRED')

    def test_cli_reports_scope(self):
        script = SKILLS/'lab-analysis'/'scripts'/'validate_comparison.py'
        sample = SKILLS/'lab-analysis'/'references'/'synthetic-example.json'
        run = subprocess.run([sys.executable,str(script),str(sample)],capture_output=True,text=True,check=False)
        self.assertEqual(run.returncode,0,run.stderr)
        self.assertEqual(json.loads(run.stdout)['scope'],'STRUCTURE_AND_SELECTED_INVARIANTS_ONLY')

    def test_malformed_dimensions_fail_without_exception(self):
        for bad in (None,42,[], 'untrusted'):
            p=example('lab-analysis')
            p['compatibility']['units']=bad
            p['right']['unit']='g/L'
            with self.subTest(bad=bad):
                self.assertTrue(lab.validate(p))


if __name__ == '__main__':
    unittest.main()
