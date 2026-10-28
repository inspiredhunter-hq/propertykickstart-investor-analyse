// ACT-882: all HMO production finance/mobile acceptance is tested against the current approved analyser.
// Previous assertions expected retired HMO controls and superseded cost assumptions.
// Delegate to the full current acceptance suite, covering capital, expenses, user-edit overrides,
// selected SDLT, acknowledgements, mobile widths (320/390/430/1280), PDF and room breakdown.
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/check-hmo-test-preview.mjs'],{stdio:'inherit',env:{...process.env,HMO_TEST_ROUTE:'HMO-NW-2S98D/'}});
