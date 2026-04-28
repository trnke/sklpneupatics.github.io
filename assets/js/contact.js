document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('contactForm');
    if (!form) {
        return;
    }

    var statusNode = document.getElementById('contact-status');
    var submitButton = form.querySelector('[type="submit"]');
    var endpoint = form.getAttribute('action') || form.dataset.endpoint || '/api/postmark-contact';
    var redirectInput = form.querySelector('[name="_next"]');
    var recaptchaHelp = document.getElementById('recaptcha-help');

    // Show a visible thank-you banner if the URL has ?thanks=1 (or true)
    (function showThankYouBannerIfNeeded() {
        try {
            var url = new URL(window.location.href);
            var thanks = (url.searchParams.get('thanks') || '').toLowerCase();
            if (thanks === '1' || thanks === 'true' || thanks === 'yes') {
                var card = document.querySelector('.contact-card');
                if (card) {
                    var alert = document.createElement('div');
                    alert.className = 'alert alert-success alert-dismissible fade show mb-4';
                    alert.setAttribute('role', 'alert');
                    alert.innerHTML = '<strong>Hvala!</strong> Vaša poruka je uspešno poslata. Odgovorićemo u najkraćem roku.' +
                        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
                    card.insertBefore(alert, card.firstChild);

                    // Auto-dismiss after 5 seconds using Bootstrap if available, else fallback
                    setTimeout(function () {
                        try {
                            if (window.bootstrap && window.bootstrap.Alert) {
                                var bsAlert = window.bootstrap.Alert.getOrCreateInstance(alert);
                                bsAlert.close();
                            } else {
                                // Fallback: remove with fade-out
                                alert.classList.remove('show');
                                alert.addEventListener('transitionend', function () {
                                    if (alert && alert.parentNode) alert.parentNode.removeChild(alert);
                                }, { once: true });
                            }
                        } catch (e) {
                            if (alert && alert.parentNode) alert.parentNode.removeChild(alert);
                        }
                    }, 5000);
                }
                // Clean the URL so refresh/share does not keep the flag
                url.searchParams.delete('thanks');
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', url.pathname + (url.search ? '?' + url.searchParams.toString() : '') + url.hash);
                }
            }
        } catch (e) {
            // no-op if URL API unavailable
        }
    })();

    function setStatus(message, isError) {
        if (!statusNode) {
            return;
        }
        statusNode.textContent = message || '';
        statusNode.classList.toggle('text-success', !isError && !!message);
        statusNode.classList.toggle('text-danger', !!isError);
    }

    function setRecaptchaError(visible, text) {
        if (!recaptchaHelp) return;
        if (typeof text === 'string' && text) {
            recaptchaHelp.textContent = text;
        }
        recaptchaHelp.classList.toggle('d-none', !visible);
    }

    // Ensure button starts disabled until reCAPTCHA is solved
    if (submitButton) {
        submitButton.disabled = true;
    }

    // reCAPTCHA v2 checkbox callbacks (declared on window for the widget to call)
    window.onCaptchaSuccess = function () {
        setRecaptchaError(false);
        if (submitButton) submitButton.disabled = false;
    };
    window.onCaptchaExpired = function () {
        setRecaptchaError(true);
        if (submitButton) submitButton.disabled = true;
    };
    window.onCaptchaError = function () {
        setRecaptchaError(true, 'Došlo je do greške sa reCAPTCHA. Pokušajte ponovo.');
        if (submitButton) submitButton.disabled = true;
    };

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        setStatus('', false);

        var recaptchaToken = window.grecaptcha ? window.grecaptcha.getResponse() : '';
        if (!recaptchaToken) {
            setRecaptchaError(true);
            setStatus('Molimo potvrditi reCAPTCHA proveru.', true);
            if (submitButton) submitButton.disabled = true;
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

        var formData = new FormData(form);
        formData.set('name', name);
        formData.set('email', email);
        formData.set('subject', subject);
        formData.set('message', message);
        formData.set('g-recaptcha-response', recaptchaToken);

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.originalLabel = submitButton.textContent;
            submitButton.textContent = 'Saljem...';
        }

        setStatus('Saljem poruku...', false);

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            body: formData
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
                // After reset, require new captcha
                setRecaptchaError(false);
                if (submitButton) submitButton.disabled = true;
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = submitButton.dataset.originalLabel || 'Posalji';
                }
                if (redirectInput && redirectInput.value) {
                    window.location.href = redirectInput.value;
                }
            })
            .catch(function (error) {
                console.error('Formspree submission failed', error);
                setStatus('Doslo je do greske. Pokusajte ponovo kasnije.', true);
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = submitButton.dataset.originalLabel || 'Posalji';
                }
            });
    });
});
