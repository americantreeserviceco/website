// Instant auto-reply for the Formspree contact forms.
// Submits the form in place and tells the sender right away whether Mandi is
// in, when to expect a reply, and who to call if it can't wait.
(() => {
	// Office hours in Mountain Time, keyed by day (0 = Sunday). Keep in sync with /contact/.
	const HOURS = {
		1: [8, 17],
		2: [8, 17],
		3: [8, 17],
		4: [8, 17],
		5: [8, 17],
		6: [9, 15],
	};

	// Days Mandi is out (vacation, holidays). Inclusive, YYYY-MM-DD.
	// Example: { from: '2026-11-26', to: '2026-11-27' },
	const AWAY = [
	];

	const TIME_ZONE = 'America/Denver';
	const PHONE_DISPLAY = '(303) 456-6898';
	const PHONE_LINK = 'tel:+13034566898';
	const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	// Current wall-clock time in Golden, regardless of the visitor's own time zone.
	function denverNow() {
		const parts = {};
		new Intl.DateTimeFormat('en-US', {
			timeZone: TIME_ZONE,
			year: 'numeric', month: '2-digit', day: '2-digit',
			hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
		}).formatToParts(new Date()).forEach(({ type, value }) => { parts[type] = Number(value); });
		return { year: parts.year, month: parts.month, day: parts.day, minutes: parts.hour * 60 + parts.minute };
	}

	function isoDate(date) {
		return date.toISOString().slice(0, 10);
	}

	function isAway(date) {
		const iso = isoDate(date);
		return AWAY.some((range) => iso >= range.from && iso <= range.to);
	}

	function formatHour(hour) {
		const suffix = hour < 12 ? 'AM' : 'PM';
		return `${hour % 12 || 12}:00 ${suffix}`;
	}

	// Returns { available, nextOpen } where nextOpen is a phrase like "Monday at 8:00 AM" (or null).
	function availability() {
		const now = denverNow();
		const today = new Date(Date.UTC(now.year, now.month - 1, now.day));

		for (let offset = 0; offset < 60; offset += 1) {
			const date = new Date(today.getTime() + offset * 86400000);
			const hours = HOURS[date.getUTCDay()];
			if (!hours || isAway(date)) continue;

			const [open, close] = hours;
			if (offset === 0) {
				if (now.minutes >= open * 60 && now.minutes < close * 60) return { available: true };
				if (now.minutes >= close * 60) continue;
			}

			let dayLabel;
			if (offset === 0) dayLabel = 'today';
			else if (offset === 1) dayLabel = 'tomorrow';
			else if (offset < 7) dayLabel = DAY_NAMES[date.getUTCDay()];
			else dayLabel = `${DAY_NAMES[date.getUTCDay()]}, ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`;
			return { available: false, nextOpen: `${dayLabel} at ${formatHour(open)}` };
		}
		return { available: false, nextOpen: null };
	}

	function injectStyles() {
		const style = document.createElement('style');
		style.textContent = `
			.autoreply-note { margin: 0 0 16px; padding: 12px 14px; border-radius: 10px; background: #f2f7ee; border: 1px solid rgba(45, 90, 39, 0.18); color: #1e3d1a; font-size: 15px; line-height: 1.5; }
			.autoreply-note.is-away { background: #fff8e6; border-color: rgba(212, 175, 55, 0.45); color: #4a3a0a; }
			.autoreply-reply { padding: 22px 20px; border-radius: 12px; background: #f2f7ee; border: 1px solid rgba(45, 90, 39, 0.18); color: #1e3d1a; line-height: 1.6; }
			.autoreply-reply h3 { margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #1e3d1a; }
			.autoreply-reply p { margin: 0 0 10px; }
			.autoreply-reply p:last-child { margin-bottom: 0; }
			.autoreply-reply a, .autoreply-note a { color: #2d5a27; font-weight: 700; text-decoration: underline; }
			.autoreply-error { margin-top: 12px; color: #9b1c1c; font-weight: 600; }
		`;
		document.head.appendChild(style);
	}

	function backAt(status) {
		return status.nextOpen ? `, <strong>${status.nextOpen}</strong>` : '';
	}

	function noteFor(status) {
		const note = document.createElement('p');
		note.className = status.available ? 'autoreply-note' : 'autoreply-note is-away';
		note.setAttribute('role', 'status');
		note.innerHTML = status.available
			? 'Mandi is in the office now and usually replies within a few hours.'
			: `Mandi is out of the office right now. Send your message anyway and she'll reply when she's back${backAt(status)}. Urgent tree hazard or storm damage? Call <a href="${PHONE_LINK}">${PHONE_DISPLAY}</a>.`;
		return note;
	}

	function replyFor(status, name) {
		const reply = document.createElement('div');
		reply.className = 'autoreply-reply';
		reply.setAttribute('role', 'status');
		reply.setAttribute('tabindex', '-1');

		const heading = document.createElement('h3');
		heading.textContent = name ? `Thanks, ${name}! We got your message.` : 'Thanks! We got your message.';
		reply.appendChild(heading);

		const body = document.createElement('p');
		body.innerHTML = status.available
			? 'Mandi is in the office today and usually replies within a few hours. Keep an eye on your inbox, and check your spam folder if you don’t see it.'
			: `Mandi is out of the office right now, so your message is first in line. She'll reply when she's back${backAt(status)}. Keep an eye on your inbox, and check your spam folder if you don’t see it.`;
		reply.appendChild(body);

		const urgent = document.createElement('p');
		urgent.innerHTML = `<strong>Can't wait?</strong> For a fallen tree, storm damage, or a branch on a roof or power line, call <a href="${PHONE_LINK}">${PHONE_DISPLAY}</a>.`;
		reply.appendChild(urgent);

		return reply;
	}

	function setHidden(form, name, value) {
		let field = form.querySelector(`input[type="hidden"][name="${name}"]`);
		if (!field) {
			field = document.createElement('input');
			field.type = 'hidden';
			field.name = name;
			form.appendChild(field);
		}
		field.value = value;
	}

	function enhance(form) {
		form.parentNode.insertBefore(noteFor(availability()), form);

		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const status = availability();
			const button = form.querySelector('[type="submit"]');
			const buttonText = button ? button.textContent : '';
			const previousError = form.querySelector('.autoreply-error');
			if (previousError) previousError.remove();

			// Tells Mandi, in the notification email, what the sender was promised.
			setHidden(form, 'Availability when sent', status.available
				? 'In office (sender told: reply within a few hours)'
				: `Out of office (sender told: reply when she's back${status.nextOpen ? `, ${status.nextOpen}` : ''})`);

			if (button) {
				button.disabled = true;
				button.textContent = 'Sending…';
			}

			try {
				const response = await fetch(form.action, {
					method: 'POST',
					body: new FormData(form),
					headers: { Accept: 'application/json' },
				});
				if (!response.ok) throw new Error(`Formspree returned ${response.status}`);

				const nameField = form.querySelector('[name="name"]');
				const firstName = nameField ? nameField.value.trim().split(/\s+/)[0] : '';
				const reply = replyFor(status, firstName);
				const note = form.previousElementSibling;
				if (note && note.classList.contains('autoreply-note')) note.remove();
				form.replaceWith(reply);
				reply.focus();
			} catch (error) {
				if (button) {
					button.disabled = false;
					button.textContent = buttonText;
				}
				const message = document.createElement('p');
				message.className = 'autoreply-error';
				message.setAttribute('role', 'alert');
				message.innerHTML = `Sorry, your message didn't go through. Please try again, or call <a href="${PHONE_LINK}">${PHONE_DISPLAY}</a>.`;
				form.appendChild(message);
			}
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		if (!window.fetch || !window.FormData || !window.Intl) return;
		const forms = document.querySelectorAll('form[action*="formspree.io/f/"]');
		if (!forms.length) return;
		injectStyles();
		forms.forEach(enhance);
	});
})();
