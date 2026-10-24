/* ACT-882: reuse the existing Deal Clinic questionnaire. No analyser inputs transmitted. */
(function () {
  'use strict';
  if (document.getElementById('pkQuestions')) return;
  const notes = document.getElementById('notes') || document.getElementById('decisionNotes');
  const anchor = notes && notes.closest('section');
  if (!anchor) return;
  const header = document.querySelector('header p');
  const original = header ? header.textContent.trim() : '';
  const section = document.createElement('section');
  section.id = 'pkQuestions';
  section.className = 'card wide screen pk-questions';
  section.setAttribute('aria-labelledby', 'pkQuestionsHeading');
  section.innerHTML = '<h2 id="pkQuestionsHeading">Have a question?</h2>' +
    '<p>We cannot see the figures or notes you enter into this analyser. Use our existing Deal Clinic questionnaire to send a question, including the property reference below and any figures relevant to your question.</p>' +
    '<p><strong>Property reference:</strong> <span id="pkQuestionReference"></span></p>' +
    '<p>We’ll endeavour to cover submitted questions at a future Property Investment Numbers Explained session (Deal Clinic). We cannot guarantee an answer or a personal reply.</p>' +
    '<p><a class="pk-question-link" href="https://forms.gle/Mk4hDeGhupuJj3ap8" target="_blank" rel="noopener noreferrer">Submit a question for a Deal Clinic</a></p>' +
    '<p class="muted">Opens the same questionnaire used during our sessions in a new tab. Your analyser entries are not sent automatically.</p>';
  anchor.insertAdjacentElement('afterend', section);
  const reference = document.getElementById('pkQuestionReference');
  const custom = document.getElementById('propertyReference');
  function updateReference() {
    reference.textContent = custom && custom.value.trim() ? custom.value.trim() + ' (your entered property)' : original;
  }
  updateReference();
  if (custom) {
    custom.addEventListener('input', updateReference);
    // Existing reset handlers clear the custom reference on the same click.
    document.addEventListener('click', () => queueMicrotask(updateReference));
  }
})();
