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

	// Daily form loads vs submissions for the dashboard's "Website estimate form" card (form-beacon Worker).
	// Sends only the event and page path; nothing typed into the form.
	const STATS_URL = 'https://form-beacon.snowseasons.workers.dev/';

	function track(event) {
		try {
			if (navigator.sendBeacon) navigator.sendBeacon(STATS_URL, JSON.stringify({ e: event, p: location.pathname }));
		} catch (error) {
			// Counting must never get in the way of the form.
		}
	}

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

		// Search beyond every configured absence, plus a full week for the next office day.
		const lastAwayEnd = AWAY.reduce((latest, range) =>
			Math.max(latest, Date.parse(`${range.to}T00:00:00Z`) || 0), today.getTime());
		const searchDays = Math.ceil((lastAwayEnd - today.getTime()) / 86400000) + 8;
		for (let offset = 0; offset < searchDays; offset += 1) {
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

	function appendPhoneLink(parent) {
		const link = document.createElement('a');
		link.href = PHONE_LINK;
		link.textContent = PHONE_DISPLAY;
		parent.appendChild(link);
	}

	function appendBackAt(parent, status) {
		if (!status.nextOpen) return;
		parent.appendChild(document.createTextNode(" "));
		const strong = document.createElement('strong');
		strong.textContent = status.nextOpen;
		parent.appendChild(strong);
	}

	function noteFor(status) {
		const note = document.createElement('p');
		note.className = status.available ? 'autoreply-note' : 'autoreply-note is-away';
		note.setAttribute('role', 'status');

		if (status.available) {
			note.textContent = 'Mandi is in the office now. For urgent tree concerns, the typical response is same-day or next-business-day.';
		} else {
			note.appendChild(document.createTextNode("Mandi is out of the office right now. Send your message anyway and she'll reply when she's back"));
			appendBackAt(note, status);
			note.appendChild(document.createTextNode('. Urgent tree hazard or storm damage? Call '));
			appendPhoneLink(note);
			note.appendChild(document.createTextNode('.'));
		}
		return note;
	}

	function replyFor(status, name, hasEmail) {
		const reply = document.createElement('div');
		reply.className = 'autoreply-reply';
		reply.setAttribute('role', 'status');
		reply.setAttribute('tabindex', '-1');

		const heading = document.createElement('h3');
		heading.textContent = name ? `Thanks, ${name}! We got your message.` : 'Thanks! We got your message.';
		reply.appendChild(heading);

		const body = document.createElement('p');
		if (status.available) {
			body.appendChild(document.createTextNode('Mandi is in the office today. For urgent tree concerns, the typical response is same-day or next-business-day. '));
		} else {
			body.appendChild(document.createTextNode("Mandi is out of the office right now. She'll reply when she's back"));
			appendBackAt(body, status);
			body.appendChild(document.createTextNode('. '));
		}
		body.appendChild(document.createTextNode(hasEmail
			? 'Keep an eye on your inbox, and check your spam folder if you don’t see it.'
			: 'Mandi will contact you at the phone number you provided.'));
		reply.appendChild(body);

		const urgent = document.createElement('p');
		const emphasis = document.createElement('strong');
		emphasis.textContent = "Can't wait?";
		urgent.appendChild(emphasis);
		urgent.appendChild(document.createTextNode(' For a fallen tree, storm damage, or a branch on a roof or power line, call '));
		appendPhoneLink(urgent);
		urgent.appendChild(document.createTextNode('.'));
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
		let note = noteFor(availability());
		form.parentNode.insertBefore(note, form);
		let pending = false;

		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			if (pending) return;
			pending = true;
			const status = availability();
			const freshNote = noteFor(status);
			note.replaceWith(freshNote);
			note = freshNote;
			const button = form.querySelector('[type="submit"]');
			const buttonText = button ? button.textContent : '';
			const previousError = form.querySelector('.autoreply-error');
			if (previousError) previousError.remove();

			// Tells Mandi, in the notification email, what the sender was promised.
			setHidden(form, 'Availability when sent', status.available
				? 'In office (sender told: same-day or next-business-day for urgent tree concerns)'
				: `Out of office (sender told: reply when she's back${status.nextOpen ? `, ${status.nextOpen}` : ''})`);

			// Capture exactly what is sent before locking fields during the request.
			const data = new FormData(form);
			const firstName = String(data.get('name') || '').trim().split(/\s+/)[0];
			const hasEmail = Boolean(String(data.get('email') || data.get('_replyto') || '').trim());
			const controls = Array.from(form.elements);
			const disabledBefore = controls.map((control) => control.disabled);
			controls.forEach((control) => { control.disabled = true; });
			form.setAttribute('aria-busy', 'true');
			if (button) button.textContent = 'Sending…';
			const controller = new AbortController();
			let timer;
			let rejected = false;
			try {
				// Race as well as abort so even a stalled fetch implementation releases the form.
				const response = await Promise.race([
					fetch(form.action, {
						method: 'POST', body: data,
						headers: { Accept: 'application/json' }, signal: controller.signal,
					}),
					new Promise((resolve, reject) => {
						timer = setTimeout(() => {
							controller.abort();
							reject(new Error('Submission timed out'));
						}, 20000);
					}),
				]);
				if (!response.ok) {
					// Server errors can follow acceptance; only client rejections are definite.
					rejected = response.status >= 400 && response.status < 500;
					throw new Error(`Formspree returned ${response.status}`);
				}
				track('submit');
				const reply = replyFor(status, firstName, hasEmail);
				note.remove();
				form.replaceWith(reply);
				reply.focus();
			} catch (error) {
				const message = document.createElement('p');
				message.className = 'autoreply-error';
				message.setAttribute('role', 'alert');
				message.setAttribute('tabindex', '-1');
				if (rejected) {
					message.appendChild(document.createTextNode('Your submission was rejected. Please check your details before trying again, or call '));
				} else {
					message.appendChild(document.createTextNode("We couldn't confirm delivery. Your message may already have arrived. Please call "));
				}
				appendPhoneLink(message);
				message.appendChild(document.createTextNode(rejected
					? '.'
					: ' before submitting again to avoid a duplicate.'));
				form.appendChild(message);
				message.focus();
			} finally {
				clearTimeout(timer);
				controls.forEach((control, index) => { control.disabled = disabledBefore[index]; });
				form.removeAttribute('aria-busy');
				if (button) button.textContent = buttonText;
				pending = false;
			}
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		if (!window.fetch || !window.FormData || !window.Intl || !window.AbortController) return;
		const forms = document.querySelectorAll('form[action*="formspree.io/f/"]');
		if (!forms.length) return;
		track('load');
		injectStyles();
		forms.forEach(enhance);
	});
})();
