document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('contactForm');
    if (!form) {
        return;
    }

    var statusNode = document.getElementById('contact-status');
    var submitButton = form.querySelector('[type="submit"]');
    var endpoint = form.dataset.endpoint || '/api/postmark-contact';
    var redirectInput = form.querySelector('[name="_next"]');

    function setStatus(message, isError) {
        if (!statusNode) {
            return;
        }
        statusNode.textContent = message || '';
        statusNode.classList.toggle('text-success', !isError && !!message);
        statusNode.classList.toggle('text-danger', !!isError);
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();


        var recaptchaToken = window.grecaptcha ? window.grecaptcha.getResponse() : '';
        if (!recaptchaToken) {
            setStatus('Molimo potvrditi reCAPTCHA proveru.', true);
            return;
        }

        var name = (document.getElementById('senderName').value || '').trim();
        var email = (document.getElementById('senderEmail').value || '').trim();
        var subject = (document.getElementById('subject').value || '').trim() || 'Poruka sa sajta SKL Pneumatics';
        var message = (document.getElementById('message').value || '').trim();

        if (!name || !email || !message) {
            setStatus('Popunite ime, mejl i poruku pre slanja.', true);
            return;
        }

        var payload = {
            name: name,
            email: email,
            subject: subject,
            message: message,
            recaptchaToken: recaptchaToken
        };

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.originalLabel = submitButton.textContent;
            submitButton.textContent = 'Saljem...';
        }

        setStatus('Saljem poruku...', false);

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Mrezni zahtev nije uspeo');
                }
                return response.json().catch(function () {
                    return {};
                });
            })
            .then(function () {
                setStatus('Poruka je poslata. Hvala na kontaktiranju!', false);
                form.reset();
                if (window.grecaptcha) { window.grecaptcha.reset(); }
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = submitButton.dataset.originalLabel || 'Posalji';
                }
                if (redirectInput && redirectInput.value) {
                    window.location.href = redirectInput.value;
                }
            })
            .catch(function (error) {
                console.error('Postmark submission failed', error);
                setStatus('Doslo je do greske. Pokusajte ponovo kasnije.', true);
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = submitButton.dataset.originalLabel || 'Posalji';
                }
            });
    });
});
