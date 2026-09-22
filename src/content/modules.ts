import type { Role, TrainingModule } from "../types";
import { after, btn, inp, kv, row, sel, txt, until } from "./builders";

/**
 * The Lupa Academy curriculum. Each module teaches one real clinic workflow:
 * how staff did it in their legacy PIMS, how it works in Lupa, a short lesson,
 * a knowledge check and a hands-on simulation that must be completed correctly.
 */
export const MODULES: TrainingModule[] = [
  /* ------------------------------------------------------------------ */
  {
    id: "fundamentals",
    title: "Lupa Fundamentals & Jerry",
    category: "Core",
    roles: ["vet", "tech", "frontdesk", "manager"],
    minutes: 8,
    summary: "Find any patient, read their whole history on one timeline, and ask Jerry, Lupa's AI assistant, instead of digging.",
    oldWay: [
      "Log into {pims} on a specific workstation (or remote in from home).",
      "Open the patient record, then switch to VetConnect / email / scanned PDFs for labs and referral letters.",
      "Scroll through years of free-text notes to find a vaccine date.",
      "Ask a colleague or check a spreadsheet to see what a health plan still covers.",
    ],
    newWay: [
      "Log into Lupa from any browser, tablet or the iOS / Android app.",
      "Every visit, lab result (IDEXX syncs automatically), message and invoice sits on one patient timeline.",
      "Ask Jerry in plain English: \"When was Biscuit's last rabies vaccine?\"",
      "Health plan allowances show on the patient record, so you can book what is covered in one click.",
    ],
    impact: "Front desk teams typically answer history and plan questions in under 30 seconds instead of 3–4 minutes.",
    lesson: [
      {
        heading: "One timeline per patient",
        body: "Lupa replaces the patchwork of {pims}, lab portals and spreadsheets. Consults, labs, messages, invoices, vaccines and plan usage are all events on the patient timeline. Filter the timeline instead of opening separate modules.",
      },
      {
        heading: "Meet Jerry",
        body: "Jerry is Lupa's built-in AI assistant. It reads the patient's record for you and answers with a source link, so you can always verify. Use Jerry for history questions (last vaccine, last weight, current meds) and for health plan allocations.",
      },
      {
        heading: "Act from where you are",
        body: "Most actions (book, message, invoice) can be started from the patient record itself. You rarely need to navigate away and re-search the patient, a common source of mistakes in {pims}.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "A client asks when their dog's last rabies vaccine was. What's the fastest correct approach in Lupa?",
        options: [
          "Scroll through the clinical notes until you find it",
          "Ask Jerry on the patient record and check the linked source",
          "Call the vet who saw the patient last",
          "Export the history to PDF and search it",
        ],
        correct: 1,
        explain: "Jerry answers history questions instantly and links to the source record so you can verify.",
      },
      {
        id: "q2",
        prompt: "Where do IDEXX lab results appear in Lupa?",
        options: [
          "In a separate VetConnect window",
          "They must be scanned and attached manually",
          "Automatically on the patient timeline",
          "Only in the Reports module",
        ],
        correct: 2,
        explain: "IDEXX is integrated: results sync onto the patient timeline automatically.",
      },
      {
        id: "q3",
        prompt: "Where can you see what a patient's health plan still covers?",
        options: [
          "On the patient record's Health plan tab (or by asking Jerry)",
          "In a shared spreadsheet",
          "Only the practice manager can see this",
          "In the Inventory module",
        ],
        correct: 0,
        explain: "Plan allowances live on the patient record, and Jerry can summarise them.",
      },
    ],
    sim: {
      scenario: "Maria Alvarez calls: is Biscuit (Labrador, 6y) due for his rabies booster, and is it covered by his health plan? If so, book it.",
      screens: [
        {
          id: "home",
          nav: "home",
          title: "Good morning, Riverside",
          subtitle: "Tuesday · 24 appointments · 3 unread messages",
          sections: [
            { title: "Today", layout: "row", items: [kv([["Appointments", "24"], ["Checked in", "6"], ["Awaiting payment", "2"]])] },
            { title: "Ask Jerry", items: [txt("Ask anything about a patient, client or your clinic…", "muted")] },
          ],
        },
        {
          id: "patients",
          nav: "patients",
          title: "Patients",
          subtitle: "Search by pet, owner, phone or microchip",
          sections: [
            {
              items: [inp("pt-search", "Search patients", "e.g. Biscuit, Alvarez, 07…")],
            },
            {
              title: "Results",
              layout: "table",
              columns: ["Patient", "Owner", "Species", "Last visit"],
              items: [
                row("row-bella", ["Bella", "J. Okafor", "Canine · Beagle", "3 weeks ago"], undefined, after("search")),
                row("row-biscuit", ["Biscuit", "Maria Alvarez", "Canine · Labrador", "11 months ago"], "Plan", after("search")),
                row("row-biscotti", ["Biscotti", "T. Nguyen", "Feline · DSH", "2 months ago"], undefined, after("search")),
              ],
            },
          ],
        },
        {
          id: "record",
          nav: "patients",
          title: "Biscuit · Labrador · 6y · 32.4 kg",
          subtitle: "Owner: Maria Alvarez · Wellness Plus plan",
          sections: [
            {
              title: "Ask Jerry",
              span: "half",
              items: [
                sel("jerry-q", "Question", [
                  "Summarise the last visit",
                  "When was the last rabies vaccine?",
                  "List current medications",
                ]),
                txt("Jerry: Biscuit's last rabies vaccine was 14 Oct last year (1-year vaccine). He is due now. Source: Consult #4471 ↗", "ai", after("jerry")),
              ],
            },
            {
              title: "Record",
              span: "half",
              items: [
                btn("tab-timeline", "Timeline"),
                btn("tab-meds", "Medications"),
                btn("tab-plan", "Health plan"),
                kv(
                  [
                    ["Wellness Plus", "Active · renews Mar"],
                    ["Rabies booster", "1 of 1 remaining: covered"],
                    ["Nail clips", "3 of 4 remaining"],
                  ],
                  after("plan"),
                ),
                btn("book-from-record", "Book covered booster", "primary", after("plan")),
              ],
            },
          ],
        },
      ],
      steps: [
        {
          id: "nav",
          screen: "home",
          target: "nav:patients",
          instruction: "Open the Patients area from the top bar.",
          hint: "Look for Patients in the top navigation bar.",
          wrong: { "nav:calendar": "Calendar shows bookings, but you need the patient's history first." },
        },
        {
          id: "search",
          screen: "patients",
          target: "pt-search",
          value: "biscuit",
          instruction: "Search for Biscuit.",
          hint: "Type the pet's name, Biscuit, into the search box and press Enter.",
        },
        {
          id: "open",
          screen: "patients",
          target: "row-biscuit",
          instruction: "Open the correct Biscuit record (owner: Maria Alvarez).",
          hint: "Two pets have similar names. Check the owner column.",
          wrong: { "row-biscotti": "That's Biscotti the cat, owned by T. Nguyen. Always confirm the owner." },
          why: "Confirming the owner avoids the classic 'wrong patient' error.",
        },
        {
          id: "jerry",
          screen: "record",
          target: "jerry-q",
          value: "When was the last rabies vaccine?",
          instruction: "Ask Jerry when Biscuit's last rabies vaccine was.",
          hint: "Use the Ask Jerry question picker on the left.",
          why: "Jerry cites its source, so you can verify it in one click.",
        },
        {
          id: "plan",
          screen: "record",
          target: "tab-plan",
          instruction: "Check whether the booster is covered by Biscuit's health plan.",
          hint: "Open the Health plan tab on the record.",
        },
        {
          id: "book",
          screen: "record",
          target: "book-from-record",
          instruction: "Book the covered booster directly from the record.",
          hint: "The plan panel now shows a booking button.",
          wrong: { "nav:calendar": "You can, but booking from the record pre-fills the patient and plan. Use the record button." },
        },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "booking",
    title: "Appointments, Online Booking & Check-in",
    category: "Front Desk",
    roles: ["frontdesk", "manager"],
    minutes: 10,
    summary: "Book, confirm and check in patients, and handle online bookings that arrive by themselves.",
    oldWay: [
      "Answer the phone and open the {pims} appointment book.",
      "Search the client, pick a slot, type the reason in a free-text field.",
      "Phone or text the client manually the day before to confirm.",
      "On arrival, find the appointment and change its status by hand; tell the vet by walking over.",
    ],
    newWay: [
      "Clients book online 24/7 into slots you control; phone bookings take seconds in the Lupa calendar.",
      "Choose a structured appointment type so the right duration, room and pre-visit form are applied.",
      "Automated WhatsApp / SMS reminders confirm or reschedule for you.",
      "Check-in updates the vet's and techs' boards instantly. No walking over.",
    ],
    impact: "Automated reminders reduce no-shows; clinics often see a double-digit drop in the first quarter.",
    lesson: [
      {
        heading: "Appointment types are not free text",
        body: "In {pims} the reason for visit was often free text. In Lupa you pick an appointment type (Vaccination, Consult, Dental, Surgery admit…). The type drives duration, room, reminder template and the pre-visit form, so choosing it correctly matters.",
      },
      {
        heading: "Online bookings",
        body: "Online bookings land directly in the calendar with a green 'Online' tag. You don't re-key them, but do review new-client bookings to confirm contact details.",
      },
      {
        heading: "Check-in is a status change the whole team sees",
        body: "When a client arrives, open the appointment and press Check in. The appointment turns amber on every board, and the assigned tech gets a task to weigh the patient.",
      },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Why must you choose a structured appointment type instead of typing the reason?",
        options: [
          "It looks tidier",
          "It sets duration, room, reminder template and pre-visit form automatically",
          "Free text is disabled for front desk users",
          "It is only needed for surgery",
        ],
        correct: 1,
        explain: "Appointment types carry the operational rules for that visit.",
      },
      {
        id: "q2",
        prompt: "A client arrives for their 10:30. What happens when you press Check in?",
        options: [
          "Nothing, it's just for records",
          "An invoice is created immediately",
          "The whole team sees the status change and the tech gets a weigh-in task",
          "The client is sent a satisfaction survey",
        ],
        correct: 2,
        explain: "Check-in updates every board in real time and triggers intake tasks.",
      },
      {
        id: "q3",
        prompt: "Who sends the appointment reminders?",
        options: [
          "Front desk calls every client the day before",
          "Lupa sends them automatically via WhatsApp/SMS",
          "The vet sends them after the consult",
          "Reminders aren't supported",
        ],
        correct: 1,
        explain: "Lupa automates reminders and lets clients confirm or reschedule.",
      },
      {
        id: "q4",
        prompt: "An online booking arrives from a brand-new client. What should you do?",
        options: [
          "Delete it and call them",
          "Re-key it into the calendar",
          "Review it and confirm the new client's contact details",
          "Nothing, ever",
        ],
        correct: 2,
        explain: "Online bookings are already in the calendar; just verify new-client details.",
      },
    ],
    sim: {
      scenario: "Maria Alvarez phones to book Biscuit's rabies booster for tomorrow morning. Then Luna (J. Park) arrives for her 10:30 consult. Check her in.",
      screens: [
        {
          id: "home",
          nav: "home",
          title: "Front desk",
          subtitle: "Tuesday · 24 appointments",
          sections: [{ title: "Today", items: [kv([["Next arrival", "Luna · 10:30"], ["Online bookings (new)", "2"]])] }],
        },
        {
          id: "cal",
          nav: "calendar",
          title: "Calendar · Wednesday",
          subtitle: "Dr. Chen · Dr. Patel · Tech room",
          sections: [
            {
              title: "Wednesday morning · Dr. Chen",
              layout: "table",
              columns: ["Time", "Status"],
              items: [
                row("slot-0830", ["08:30", "Booked · Rocky"]),
                row("slot-0900", ["09:00", "Available"], "Free"),
                row("slot-0930", ["09:30", "Booked · Online · Milo"], "Online"),
              ],
            },
          ],
        },
        {
          id: "newappt",
          nav: "calendar",
          title: "New appointment · Wed 09:00 · Dr. Chen",
          sections: [
            {
              items: [
                kv([["Patient", "Biscuit (Maria Alvarez)"]]),
                sel("appt-type", "Appointment type", ["Consult (15 min)", "Vaccination (10 min)", "Dental (60 min)", "Surgery admit"]),
                sel("reminder", "Reminder", ["None", "WhatsApp 24h before", "Phone call"], after("type")),
                btn("save-appt", "Save appointment", "primary", after("reminder")),
              ],
            },
          ],
        },
        {
          id: "today",
          nav: "calendar",
          title: "Calendar · Today",
          subtitle: "Arrivals",
          sections: [
            {
              items: [txt("✓ Biscuit booked Wed 09:00 · WhatsApp reminder scheduled", "success")],
            },
            {
              title: "Arrivals",
              layout: "table",
              columns: ["Time", "Patient", "Owner"],
              items: [
                row("appt-luna", ["10:30", "Luna", "J. Park"], "Due"),
                row("appt-max", ["10:45", "Max", "R. Diaz"]),
              ],
            },
            {
              title: "Luna · 10:30 Consult · Dr. Patel",
              items: [
                btn("checkin", "Check in", "primary", after("open-luna")),
                btn("invoice-luna", "Create invoice", "ghost", after("open-luna")),
                btn("cancel-luna", "Cancel appointment", "danger", after("open-luna")),
                txt("Luna checked in · Dr. Patel and Tech board notified · weigh-in task created for Sam", "success", after("checkin")),
              ],
            },
          ],
        },
      ],
      steps: [
        {
          id: "nav",
          screen: "home",
          target: "nav:calendar",
          instruction: "Open the Calendar.",
          hint: "Calendar is in the top bar.",
        },
        {
          id: "slot",
          screen: "cal",
          target: "slot-0900",
          instruction: "Choose the first free slot tomorrow morning with Dr. Chen.",
          hint: "09:00 is the free slot.",
          wrong: { "slot-0930": "That slot is already taken by an online booking (Milo)." },
        },
        {
          id: "type",
          screen: "newappt",
          target: "appt-type",
          value: "Vaccination (10 min)",
          instruction: "Set the correct appointment type for a rabies booster.",
          hint: "A booster is a Vaccination appointment.",
          why: "Vaccination sets a 10 minute slot and attaches the vaccine reminder template.",
        },
        {
          id: "reminder",
          screen: "newappt",
          target: "reminder",
          value: "WhatsApp 24h before",
          instruction: "Make sure the client gets an automatic reminder.",
          hint: "Pick the WhatsApp reminder.",
        },
        {
          id: "save",
          screen: "newappt",
          target: "save-appt",
          instruction: "Save the appointment.",
          hint: "Press Save appointment.",
        },
        {
          id: "open-luna",
          screen: "today",
          target: "appt-luna",
          instruction: "Luna has just walked in. Open her 10:30 appointment.",
          hint: "Find Luna in today's arrivals.",
        },
        {
          id: "checkin",
          screen: "today",
          target: "checkin",
          instruction: "Check Luna in so the clinical team knows she's here.",
          hint: "Press Check in, not Create invoice.",
          wrong: { "invoice-luna": "Invoices come at checkout, after the consult. Check the patient in first." },
        },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "whatsapp",
    title: "WhatsApp Messaging & Automated Reminders",
    category: "Front Desk",
    roles: ["frontdesk"],
    minutes: 8,
    summary: "Run two-way client conversations from the shared inbox, attach them to the right patient, and use templates.",
    oldWay: [
      "Clients call; you play voicemail tag or text from a personal / clinic mobile.",
      "Messages live outside {pims}, so nobody else can see the conversation.",
      "Copy important client messages into the notes by hand (or not at all).",
    ],
    newWay: [
      "Two-way WhatsApp is built into Lupa's shared Messages inbox.",
      "Each thread is linked to the client and patient, and saved on the timeline automatically.",
      "Use templates and assign threads to a colleague or vet when you need input.",
    ],
    impact: "No more personal phones for client comms. Every message is auditable and on the record.",
    lesson: [
      { heading: "The shared inbox", body: "All client messages (WhatsApp, SMS and email) land in one Messages inbox. Unassigned threads are visible to the whole front desk team." },
      { heading: "Link, then reply", body: "If a thread comes from an unknown number, link it to the right client first. Once linked, the conversation appears on the patient's timeline." },
      { heading: "Assign clinical questions", body: "Never answer clinical questions yourself. Assign the thread to the vet. They get a task and can reply directly." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "A client asks on WhatsApp whether their dog's vomiting is serious. What do you do?",
        options: ["Reply with your best guess", "Assign the thread to the vet", "Ignore it", "Tell them to Google it"],
        correct: 1,
        explain: "Clinical questions go to a vet via assignment.",
      },
      {
        id: "q2",
        prompt: "Where do WhatsApp conversations get stored?",
        options: ["Only on the front desk phone", "On the linked client and patient timeline", "They are deleted after 24h", "In the Inventory module"],
        correct: 1,
        explain: "Linked conversations are saved on the timeline.",
      },
      {
        id: "q3",
        prompt: "A message arrives from an unknown number. First step?",
        options: ["Link it to the correct client", "Reply asking for a card number", "Block the number", "Forward to the manager"],
        correct: 0,
        explain: "Link the thread so it's on the right record.",
      },
    ],
    sim: {
      scenario: "A WhatsApp message from an unknown number: \"Hi, it's Maria, Biscuit threw up twice this morning, should I bring him in?\"",
      screens: [
        {
          id: "home",
          nav: "home",
          title: "Front desk",
          sections: [{ items: [kv([["Unread messages", "3"]])] }],
        },
        {
          id: "inbox",
          nav: "messages",
          title: "Messages",
          subtitle: "Shared inbox · WhatsApp · SMS · Email",
          sections: [
            {
              title: "Unassigned",
              layout: "table",
              columns: ["From", "Preview", "Channel"],
              items: [
                row("th-maria", ["+1 (415) 555-0142", "Hi, it's Maria, Biscuit threw up twice…", "WhatsApp"], "New"),
                row("th-supplier", ["NVS Orders", "Your order #88213 has shipped", "Email"]),
              ],
            },
          ],
        },
        {
          id: "thread",
          nav: "messages",
          title: "+1 (415) 555-0142 · WhatsApp",
          subtitle: "Unknown number",
          sections: [
            {
              title: "Conversation",
              span: "half",
              items: [
                txt("Maria: Hi, it's Maria, Biscuit threw up twice this morning, should I bring him in?"),
                txt("You: Thanks Maria, I've passed this to Dr. Chen who will reply shortly.", "strong", after("template")),
              ],
            },
            {
              title: "Actions",
              span: "half",
              items: [
                sel("link-client", "Link to client", ["Maria Alvarez (Biscuit)", "Maria Santos (Coco)", "Create new client"]),
                sel("template", "Reply template", ["Payment reminder", "Passed to vet", "Opening hours"], after("link")),
                sel("assign", "Assign to", ["Unassigned", "Dr. Chen", "Front desk"], after("template")),
                txt("Thread linked to Biscuit · visible on timeline", "success", after("link")),
                txt("Dr. Chen has a new task: reply to Maria about vomiting", "success", after("assign")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "nav", screen: "home", target: "nav:messages", instruction: "Open the shared Messages inbox.", hint: "Messages is in the top bar." },
        { id: "open", screen: "inbox", target: "th-maria", instruction: "Open the new WhatsApp thread.", hint: "It's the one marked New." },
        {
          id: "link",
          screen: "thread",
          target: "link-client",
          value: "Maria Alvarez (Biscuit)",
          instruction: "Link this unknown number to the right client.",
          hint: "The message mentions Biscuit.",
          wrong: {},
          why: "Linking puts the conversation on Biscuit's timeline for the vet to see.",
        },
        {
          id: "template",
          screen: "thread",
          target: "template",
          value: "Passed to vet",
          instruction: "Reply using the correct template. Don't give clinical advice.",
          hint: "Use the 'Passed to vet' template.",
        },
        {
          id: "assign",
          screen: "thread",
          target: "assign",
          value: "Dr. Chen",
          instruction: "Assign the thread to Biscuit's vet so they can respond.",
          hint: "Assign to Dr. Chen.",
        },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "checkout",
    title: "Checkout with Lupa Pay",
    category: "Front Desk",
    roles: ["frontdesk", "manager"],
    minutes: 9,
    summary: "Finalise the invoice the vet prepared, take card payment on Lupa Pay, or send a payment link. No separate terminal.",
    oldWay: [
      "Print or re-key charges the vet wrote down into the {pims} invoice.",
      "Type the amount into a separate card terminal and hope it matches.",
      "Reconcile the terminal and {pims} totals at end of day.",
    ],
    newWay: [
      "The vet's approved charges arrive on the invoice. Front desk just reviews them.",
      "Take payment with Lupa Pay (card on file, tap to pay or payment link). The amount is never re-typed.",
      "Payments reconcile automatically; plan-covered items are zeroed by Lupa.",
    ],
    impact: "Eliminates the #1 end-of-day reconciliation issue: mismatched terminal amounts.",
    lesson: [
      { heading: "Review, don't re-key", body: "Invoices are pre-filled from the consult. Your job is to check them with the client, not rebuild them. Plan-covered items show as $0.00 with a Plan tag." },
      { heading: "Lupa Pay", body: "Choose Take payment and pick a method: tap / card present, card on file, or send a payment link by WhatsApp. The amount is carried over automatically." },
      { heading: "Never use the old terminal", body: "Using a separate terminal breaks automatic reconciliation. If Lupa Pay is down, use a payment link, and tell your practice manager." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "The client wants to pay later at home. What do you do?",
        options: ["Write an IOU", "Send a Lupa Pay payment link", "Use the old terminal", "Mark as paid"],
        correct: 1,
        explain: "Payment links let clients pay remotely and still reconcile automatically.",
      },
      {
        id: "q2",
        prompt: "Why should you never type amounts into the old card terminal?",
        options: ["It's slower", "It breaks automatic reconciliation", "It's more expensive", "It doesn't print receipts"],
        correct: 1,
        explain: "Lupa Pay keeps invoice and payment in sync.",
      },
      {
        id: "q3",
        prompt: "An item shows $0.00 with a Plan tag. What does that mean?",
        options: ["It's an error", "It's covered by the patient's health plan", "The vet forgot to price it", "It's a discount you applied"],
        correct: 1,
        explain: "Plan-covered items are zeroed automatically.",
      },
    ],
    sim: {
      scenario: "Biscuit's consult is done. Dr. Chen approved the charges. Maria is at the desk and wants to pay by card now.",
      screens: [
        { id: "home", nav: "home", title: "Front desk", sections: [{ items: [kv([["Awaiting payment", "Biscuit · Maria Alvarez"]])] }] },
        {
          id: "billing",
          nav: "billing",
          title: "Billing",
          subtitle: "Ready for checkout",
          sections: [
            {
              layout: "table",
              columns: ["Patient", "Client", "Total", "Status"],
              items: [
                row("inv-biscuit", ["Biscuit", "Maria Alvarez", "$186.40", "Ready"], "Ready"),
                row("inv-rocky", ["Rocky", "D. Lee", "$92.00", "Draft"]),
              ],
            },
          ],
        },
        {
          id: "invoice",
          nav: "billing",
          title: "Invoice #10492 · Biscuit",
          subtitle: "Maria Alvarez · approved by Dr. Chen",
          sections: [
            {
              title: "Line items",
              span: "half",
              items: [
                kv([
                  ["Consultation", "$68.00"],
                  ["Rabies vaccine (Plan)", "$0.00"],
                  ["Maropitant 16mg ×4", "$42.40"],
                  ["Bland diet 2kg", "$36.00"],
                  ["Blood panel (IDEXX)", "$40.00"],
                  ["Total", "$186.40"],
                ]),
              ],
            },
            {
              title: "Checkout",
              span: "half",
              items: [
                btn("review-items", "Review items with client"),
                btn("edit-items", "Edit line items"),
                btn("take-payment", "Take payment (Lupa Pay)", "primary", after("review")),
                sel("pay-method", "Payment method", ["Tap / card present", "Card on file", "Send payment link", "Old terminal"], after("take")),
                btn("confirm-pay", "Charge $186.40", "primary", after("method")),
                txt("Paid · receipt sent via WhatsApp · reconciled", "success", after("charge")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "nav", screen: "home", target: "nav:billing", instruction: "Go to Billing.", hint: "Billing is in the top bar." },
        { id: "open", screen: "billing", target: "inv-biscuit", instruction: "Open Biscuit's invoice.", hint: "It's marked Ready." },
        {
          id: "review",
          screen: "invoice",
          target: "review-items",
          instruction: "Review the pre-filled items with Maria before charging.",
          hint: "Use 'Review items with client'. There's no need to edit or re-key.",
          wrong: { "edit-items": "The vet already approved these. Review them with the client rather than editing." },
        },
        { id: "take", screen: "invoice", target: "take-payment", instruction: "Start a Lupa Pay payment.", hint: "Take payment (Lupa Pay)." },
        {
          id: "method",
          screen: "invoice",
          target: "pay-method",
          value: "Tap / card present",
          instruction: "Maria is at the desk with her card. Choose the right method.",
          hint: "She's present with a card: tap / card present.",
          wrong: {},
        },
        { id: "charge", screen: "invoice", target: "confirm-pay", instruction: "Charge the invoice.", hint: "Press Charge $186.40." },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "insurance",
    title: "Insurance Claims",
    category: "Front Desk",
    roles: ["frontdesk", "manager"],
    minutes: 7,
    summary: "Create an insurance claim straight from an invoice, with clinical notes attached automatically.",
    oldWay: [
      "Print the invoice and clinical history from {pims}.",
      "Fill in the insurer's PDF form by hand and scan it.",
      "Track claim status in a spreadsheet and chase by phone.",
    ],
    newWay: [
      "Start a claim from the paid invoice. Lupa pre-fills policy, invoice and SOAP notes.",
      "Submit electronically and track status in the Insurance area.",
      "Get notified when the insurer requests more info or pays out.",
    ],
    impact: "Claims that took ~20 minutes of admin take ~2.",
    lesson: [
      { heading: "Claims start from invoices", body: "Open the invoice, choose Create claim. Lupa attaches the relevant SOAP notes and history for the condition." },
      { heading: "Check the policy", body: "Confirm the insurer and policy number before submitting. They are stored on the client record once entered." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Where do you start an insurance claim?",
        options: ["From the paid invoice", "From the calendar", "From Inventory", "You email the insurer"],
        correct: 0,
        explain: "Claims start from the invoice so everything is pre-filled.",
      },
      {
        id: "q2",
        prompt: "What must you confirm before submitting?",
        options: ["Stock levels", "Insurer and policy number", "Staff rota", "Nothing"],
        correct: 1,
        explain: "Policy details must be right or the claim bounces.",
      },
    ],
    sim: {
      scenario: "Maria asks you to claim Biscuit's gastro visit on his Trupanion policy.",
      screens: [
        {
          id: "billing",
          nav: "billing",
          title: "Billing",
          sections: [
            {
              layout: "table",
              columns: ["Invoice", "Patient", "Total", "Status"],
              items: [
                row("inv-10492", ["#10492", "Biscuit", "$186.40", "Paid"]),
                row("inv-10490", ["#10490", "Luna", "$74.00", "Paid"]),
              ],
            },
          ],
        },
        {
          id: "inv",
          nav: "billing",
          title: "Invoice #10492 · Paid",
          sections: [
            {
              items: [
                btn("refund", "Refund"),
                btn("create-claim", "Create insurance claim", "primary"),
                sel("insurer", "Insurer", ["Trupanion", "Nationwide", "Healthy Paws"], after("claim")),
                inp("policy", "Policy number", "e.g. TRP-…", after("insurer")),
                txt("Attached automatically: SOAP note (gastro), IDEXX panel, invoice", "ai", after("claim")),
                btn("submit-claim", "Submit claim", "primary", after("policy")),
                txt("Claim submitted · tracking in Insurance", "success", after("submit")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "open", screen: "billing", target: "inv-10492", instruction: "Open Biscuit's paid invoice.", hint: "#10492 is Biscuit's." },
        { id: "claim", screen: "inv", target: "create-claim", instruction: "Start an insurance claim.", hint: "Create insurance claim.", wrong: { refund: "Don't refund! The client is claiming from their insurer." } },
        { id: "insurer", screen: "inv", target: "insurer", value: "Trupanion", instruction: "Select Biscuit's insurer.", hint: "Maria said Trupanion." },
        { id: "policy", screen: "inv", target: "policy", value: "TRP-448120", instruction: "Enter the policy number from Maria's card: TRP-448120.", hint: "Type TRP-448120 and press Enter." },
        { id: "submit", screen: "inv", target: "submit-claim", instruction: "Submit the claim.", hint: "Submit claim." },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "intake",
    title: "Patient Intake & Vitals",
    category: "Clinical",
    roles: ["tech", "vet"],
    minutes: 8,
    summary: "Pick up the weigh-in task, record vitals on the consult and flag concerns for the vet.",
    oldWay: [
      "Hear from reception that the patient's here; find a paper intake sheet.",
      "Write weight and temperature on paper; the vet types them into {pims} later (or not).",
      "Tell the vet about concerns verbally in the corridor.",
    ],
    newWay: [
      "A weigh-in task appears on the Tasks board the moment front desk checks in.",
      "Enter vitals directly into the consult. Lupa charts weight trends and flags abnormal values.",
      "Flag concerns in the consult so the vet sees them before walking in.",
    ],
    impact: "Vitals are captured once, at source, with trend alerts. No transcription errors.",
    lesson: [
      { heading: "Tasks drive intake", body: "Check-in creates a weigh-in task assigned to the room's tech. Claim it so colleagues know it's handled." },
      { heading: "Vitals with context", body: "Lupa compares weight against the last visit and flags drops over 5%. Temperature outside range is highlighted in red." },
      { heading: "Flag for vet", body: "Use 'Flag for vet' with a short note. The vet sees it at the top of the consult." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "How do you know a patient is ready for intake?",
        options: ["Reception shouts", "A weigh-in task appears on the Tasks board", "You check the car park", "The vet texts you"],
        correct: 1,
        explain: "Check-in automatically creates the intake task.",
      },
      {
        id: "q2",
        prompt: "Lupa flags a 7% weight drop. What should you do?",
        options: ["Ignore it", "Flag it for the vet on the consult", "Re-weigh until it's normal", "Delete the old weight"],
        correct: 1,
        explain: "Clinically relevant changes should be flagged for the vet.",
      },
    ],
    sim: {
      scenario: "Luna (J. Park) has just been checked in for her 10:30 consult with Dr. Patel. Do her intake.",
      screens: [
        { id: "home", nav: "home", title: "Tech board", sections: [{ items: [kv([["Open tasks", "4"]])] }] },
        {
          id: "tasks",
          nav: "tasks",
          title: "Tasks",
          subtitle: "Assigned to you and your room",
          sections: [
            {
              layout: "table",
              columns: ["Task", "Patient", "Due"],
              items: [
                row("task-luna", ["Weigh-in & vitals", "Luna", "Now"], "New"),
                row("task-restock", ["Restock exam room 2", "–", "Today"]),
              ],
            },
            { items: [btn("claim", "Claim task", "primary", after("open"))] },
          ],
        },
        {
          id: "vitals",
          nav: "consult",
          title: "Consult · Luna · DSH · 9y",
          subtitle: "Dr. Patel · Last weight 4.6 kg (4 months ago)",
          sections: [
            {
              title: "Vitals",
              span: "half",
              items: [
                inp("weight", "Weight (kg)", "e.g. 4.5"),
                txt("⚠ Weight down 8.7% since last visit", "warn", after("weight")),
                inp("temp", "Temperature (°F)", "e.g. 101.5", after("weight")),
              ],
            },
            {
              title: "Handover",
              span: "half",
              items: [
                btn("save-vitals", "Save vitals", "ghost", after("temp")),
                btn("flag", "Flag for vet", "primary", after("temp")),
                txt("Flag sent · Dr. Patel sees ‘8.7% weight loss’ at the top of the consult", "success", after("flag")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "nav", screen: "home", target: "nav:tasks", instruction: "Open your Tasks board.", hint: "Tasks is in the top bar." },
        { id: "open", screen: "tasks", target: "task-luna", instruction: "Open Luna's weigh-in task.", hint: "The task marked New." },
        { id: "claim", screen: "tasks", target: "claim", instruction: "Claim the task so your colleagues know you've got it.", hint: "Press Claim task." },
        { id: "weight", screen: "vitals", target: "weight", value: "4.2", instruction: "The scale reads 4.2 kg. Record Luna's weight.", hint: "Type 4.2 and press Enter." },
        { id: "temp", screen: "vitals", target: "temp", value: "101.8", instruction: "Thermometer reads 101.8 °F. Record the temperature.", hint: "Type 101.8 and press Enter." },
        {
          id: "flag",
          screen: "vitals",
          target: "flag",
          instruction: "Lupa has flagged significant weight loss. Make sure Dr. Patel sees it before walking in.",
          hint: "Use Flag for vet, not just Save.",
          wrong: { "save-vitals": "Saved, but a 8.7% weight loss should be flagged so the vet sees it first." },
        },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "tasks",
    title: "Tasks & Treatment Board",
    category: "Clinical",
    roles: ["tech"],
    minutes: 7,
    summary: "Run in-patient treatments from the live board: complete, record and hand over tasks.",
    oldWay: [
      "Paper treatment sheets on the kennel door or a whiteboard.",
      "Tick boxes by hand; the vet transfers doses into {pims} at end of day.",
      "Handovers happen verbally at shift change.",
    ],
    newWay: [
      "Treatments prescribed by the vet become timed tasks on the board.",
      "Completing a task records the dose and deducts stock automatically.",
      "Overdue tasks turn red for the whole team; handovers are written on the task.",
    ],
    impact: "Complete, timestamped treatment records and automatic stock deduction.",
    lesson: [
      { heading: "Timed tasks", body: "Each treatment has a due time. Overdue tasks turn red and notify the supervising vet." },
      { heading: "Complete with details", body: "When you complete a medication task, confirm the dose given. Lupa deducts stock and adds it to the invoice." },
      { heading: "Hand over, don't forget", body: "If your shift ends, reassign open tasks to the incoming tech with a note." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "What happens when you complete a medication task?",
        options: ["Nothing else", "Dose is recorded, stock deducted, charge added", "An email is sent to the owner", "The vet must re-enter it"],
        correct: 1,
        explain: "Task completion flows into records, stock and billing.",
      },
      {
        id: "q2",
        prompt: "Your shift ends with 2 open tasks. What do you do?",
        options: ["Leave them", "Reassign to the incoming tech with a note", "Mark them complete", "Delete them"],
        correct: 1,
        explain: "Reassignment keeps continuity of care.",
      },
    ],
    sim: {
      scenario: "Biscuit is hospitalised for fluids. His 14:00 maropitant injection is due, then your shift ends.",
      screens: [
        {
          id: "board",
          nav: "tasks",
          title: "Treatment board · Wards",
          sections: [
            {
              layout: "table",
              columns: ["Due", "Patient", "Treatment"],
              items: [
                row("t-biscuit-mar", ["14:00", "Biscuit", "Maropitant 1 mg/kg SC"], "Due"),
                row("t-biscuit-fluids", ["16:00", "Biscuit", "Check IV fluids rate"]),
              ],
            },
          ],
        },
        {
          id: "task",
          nav: "tasks",
          title: "Maropitant 1 mg/kg SC · Biscuit (32.4 kg)",
          sections: [
            {
              items: [
                inp("dose", "Dose given (mL)", "10 mg/mL → mL"),
                btn("complete", "Complete task", "primary", after("dose")),
                txt("Recorded · 3.2 mL deducted from stock · added to invoice", "success", after("complete")),
              ],
            },
          ],
        },
        {
          id: "handover",
          nav: "tasks",
          title: "Treatment board · Wards",
          sections: [
            {
              layout: "table",
              columns: ["Due", "Patient", "Treatment"],
              items: [row("t2", ["16:00", "Biscuit", "Check IV fluids rate"])],
            },
            {
              title: "Shift handover",
              items: [
                sel("reassign", "Reassign open tasks to", ["Nobody", "Sam (evening tech)", "Front desk"]),
                btn("end-shift", "End shift", "primary", after("reassign")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "open", screen: "board", target: "t-biscuit-mar", instruction: "Open the treatment that's due now.", hint: "The 14:00 maropitant." },
        { id: "dose", screen: "task", target: "dose", value: "3.2", instruction: "Biscuit weighs 32.4 kg; maropitant is 10 mg/mL. Enter the dose you gave in mL (1 decimal place).", hint: "32.4 kg × 1 mg/kg = 32.4 mg ÷ 10 mg/mL ≈ 3.2 mL." },
        { id: "complete", screen: "task", target: "complete", instruction: "Complete the task.", hint: "Press Complete task." },
        { id: "reassign", screen: "handover", target: "reassign", value: "Sam (evening tech)", instruction: "Hand over the remaining task to the evening tech.", hint: "Sam is on evenings." },
        { id: "end", screen: "handover", target: "end-shift", instruction: "End your shift.", hint: "Press End shift." },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "inventory",
    title: "Inventory & Stock Expiry",
    category: "Operations",
    roles: ["tech", "manager"],
    minutes: 7,
    summary: "Keep stock accurate: act on low-stock and expiry alerts, and receive supplier deliveries.",
    oldWay: [
      "Monthly manual stock count with a clipboard.",
      "Expired drugs found during the count, after the fact.",
      "Re-order by phone / supplier portal separately from {pims}.",
    ],
    newWay: [
      "Stock is deducted as it's used on consults and treatment tasks.",
      "Lupa alerts you to low stock and batches expiring within 60 days.",
      "Raise supplier orders (e.g. NVS) from the alert; receive them against the order.",
    ],
    impact: "Less expired-stock write-off and far fewer emergency orders.",
    lesson: [
      { heading: "Alerts, not counts", body: "The Inventory page opens on alerts: Low stock and Expiring soon. Work these first each morning." },
      { heading: "Expiring batches", body: "Move expiring batches to the front and mark them 'Use first'. Lupa then suggests that batch on treatments." },
      { heading: "Ordering", body: "Create a purchase order from a low-stock alert. It's sent to the supplier through the integration." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "A vaccine batch expires in 30 days. Best action?",
        options: ["Throw it away now", "Mark it 'Use first'", "Ignore until it expires", "Hide it from stock"],
        correct: 1,
        explain: "'Use first' makes Lupa suggest that batch.",
      },
      {
        id: "q2",
        prompt: "How do you reorder a low-stock item?",
        options: ["Phone the supplier", "Create a purchase order from the alert", "Email the manager", "Borrow from another clinic"],
        correct: 1,
        explain: "Orders go straight to the supplier integration.",
      },
    ],
    sim: {
      scenario: "Morning stock check. Deal with this morning's inventory alerts.",
      screens: [
        { id: "home", nav: "home", title: "Dashboard", sections: [{ items: [txt("2 inventory alerts need attention", "warn")] }] },
        {
          id: "inv",
          nav: "inventory",
          title: "Inventory · Alerts",
          sections: [
            {
              title: "Needs attention",
              layout: "table",
              columns: ["Item", "Issue", "Qty"],
              items: [
                row("al-rabies", ["Rabies vaccine · batch R-2291", "Expires in 30 days", "14"], "Expiring"),
                row("al-maro", ["Maropitant 10 mg/mL 20mL", "Below minimum (3)", "1"], "Low"),
              ],
            },
            {
              title: "Action",
              items: [
                btn("use-first", "Mark batch ‘Use first’", "primary", after("open-rabies")),
                btn("dispose", "Dispose batch", "danger", after("open-rabies")),
                txt("R-2291 will be suggested first on vaccinations", "success", after("usefirst")),
                btn("po", "Create purchase order", "primary", after("open-maro")),
                sel("supplier", "Supplier", ["NVS", "Covetrus", "Patterson"], after("po")),
                inp("qty", "Quantity", "", after("supplier")),
                btn("send-po", "Send order", "primary", after("qty")),
                txt("PO-7781 sent to NVS", "success", after("send")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "nav", screen: "home", target: "nav:inventory", instruction: "Open Inventory.", hint: "Inventory is in the top bar." },
        { id: "open-rabies", screen: "inv", target: "al-rabies", instruction: "Open the expiring rabies vaccine alert.", hint: "Batch R-2291." },
        { id: "usefirst", screen: "inv", target: "use-first", instruction: "The batch is still good for 30 days. Make sure it's used before newer stock.", hint: "Mark it Use first.", wrong: { dispose: "It's still in date. Disposing it wastes 14 doses." } },
        { id: "open-maro", screen: "inv", target: "al-maro", instruction: "Now open the low-stock maropitant alert.", hint: "Maropitant 10 mg/mL." },
        { id: "po", screen: "inv", target: "po", instruction: "Start a purchase order.", hint: "Create purchase order." },
        { id: "supplier", screen: "inv", target: "supplier", value: "NVS", instruction: "Order from your primary supplier, NVS.", hint: "Pick NVS." },
        { id: "qty", screen: "inv", target: "qty", value: "6", instruction: "Order 6 vials.", hint: "Type 6 and press Enter." },
        { id: "send", screen: "inv", target: "send-po", instruction: "Send the order.", hint: "Send order." },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "scribe",
    title: "AI Scribe → SOAP Notes",
    category: "Clinical",
    roles: ["vet"],
    minutes: 12,
    summary: "Let Lupa listen to the consult and draft structured SOAP notes. Review, correct and sign them.",
    oldWay: [
      "Scribble notes during the consult, or remember them.",
      "Type the full clinical note into {pims} between patients or after hours.",
      "Notes are inconsistent in structure between vets.",
    ],
    newWay: [
      "Tap Start scribe with client consent. Lupa listens to the consult.",
      "Lupa drafts a structured SOAP note (Subjective, Objective, Assessment, Plan) in seconds.",
      "You review, correct anything wrong, and sign. Signed notes are locked and auditable.",
    ],
    impact: "Vets using AI scribes commonly report saving 1–2 hours of after-hours notes per day.",
    lesson: [
      { heading: "Consent first", body: "Always confirm the client is happy for the consult to be recorded. Lupa logs consent on the consult." },
      { heading: "You are the author", body: "The scribe drafts; you are accountable. Read every section, especially doses and the Assessment, and correct anything wrong before signing." },
      { heading: "Sign to lock", body: "Unsigned notes stay in Drafts and appear on your to-do list. Signing locks the note and makes it available for claims and referrals." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "What must happen before you start the AI scribe?",
        options: ["Nothing", "Confirm client consent to record", "Ask the practice manager", "Close all other tabs"],
        correct: 1,
        explain: "Consent is required and logged.",
      },
      {
        id: "q2",
        prompt: "The draft note says 'maropitant 2 mg/kg' but you prescribed 1 mg/kg. You…",
        options: ["Sign anyway, it's close", "Correct the dose, then sign", "Delete the note", "Ask front desk"],
        correct: 1,
        explain: "You're accountable for the signed record; always correct errors.",
      },
      {
        id: "q3",
        prompt: "What does signing a note do?",
        options: ["Emails the client", "Locks the note and makes it available for claims/referrals", "Creates an invoice", "Nothing"],
        correct: 1,
        explain: "Signed notes are locked and auditable.",
      },
    ],
    sim: {
      scenario: "Biscuit (Labrador) is in for vomiting ×2 this morning. Run the consult with the AI scribe and produce a signed SOAP note.",
      screens: [
        {
          id: "cal",
          nav: "calendar",
          title: "Your day · Dr. Chen",
          sections: [
            {
              layout: "table",
              columns: ["Time", "Patient", "Status"],
              items: [row("appt-biscuit", ["09:00", "Biscuit", "Checked in · vitals done"], "Ready"), row("appt-rocky", ["09:15", "Rocky", "Booked"])],
            },
          ],
        },
        {
          id: "consult",
          nav: "consult",
          title: "Consult · Biscuit · Labrador · 32.4 kg",
          subtitle: "Reason: Vomiting ×2 · Tech note: T 101.9 °F, bright",
          sections: [
            {
              title: "AI Scribe",
              span: "half",
              items: [
                sel("consent", "Client consent to record", ["Not asked", "Consent given", "Declined"]),
                btn("start-scribe", "● Start scribe", "primary", after("consent")),
                txt("Listening… 04:12 · 2 speakers", "ai", after("start")),
                btn("stop-scribe", "■ Stop & draft note", "primary", after("start")),
              ],
            },
            {
              title: "SOAP draft",
              span: "half",
              items: [
                txt("S: Vomiting ×2 since this morning, ate grass on walk yesterday, eating less, drinking normally.", undefined, after("stop")),
                txt("O: T 101.9 °F, HR 96, mild cranial abdominal discomfort, well hydrated.", undefined, after("stop")),
                txt("A: Acute gastritis, likely dietary indiscretion.", undefined, after("stop")),
                txt("P: Maropitant 2 mg/kg SC, bland diet 3 days, recheck if persists.", "warn", { ...after("stop"), ...until("fix") }),
                txt("P: Maropitant 1 mg/kg SC, bland diet 3 days, recheck if persists.", "success", after("fix")),
                btn("edit-plan", "Edit Plan", "ghost", after("stop")),
                sel("fix", "Correct maropitant dose", ["2 mg/kg", "1 mg/kg"], after("edit")),
                btn("sign", "Sign & lock note", "primary", after("stop")),
                txt("Signed by Dr. Chen · locked · charges suggested to invoice", "success", after("sign")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "open", screen: "cal", target: "appt-biscuit", instruction: "Open Biscuit's consult from your day list.", hint: "Biscuit, 09:00." },
        { id: "consent", screen: "consult", target: "consent", value: "Consent given", instruction: "Maria agrees to the consult being recorded. Log consent.", hint: "Select Consent given." },
        { id: "start", screen: "consult", target: "start-scribe", instruction: "Start the AI scribe.", hint: "Press Start scribe." },
        { id: "stop", screen: "consult", target: "stop-scribe", instruction: "The consult is finished. Stop and generate the draft note.", hint: "Stop & draft note." },
        {
          id: "edit",
          screen: "consult",
          target: "edit-plan",
          instruction: "Review the draft. You prescribed maropitant at 1 mg/kg. Fix the error in the Plan.",
          hint: "The Plan section is highlighted. Press Edit Plan.",
          wrong: { sign: "Stop! The Plan has the wrong dose (2 mg/kg). Never sign a note with an error." },
        },
        { id: "fix", screen: "consult", target: "fix", value: "1 mg/kg", instruction: "Set the correct dose.", hint: "1 mg/kg." },
        { id: "sign", screen: "consult", target: "sign", instruction: "Sign and lock the note.", hint: "Sign & lock note." },
      ],
    },
    passScore: 85,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "charges",
    title: "AI-Suggested Charges",
    category: "Clinical",
    roles: ["vet"],
    minutes: 7,
    summary: "Approve the line items Lupa suggests from your consult, so nothing is missed and front desk doesn't re-key.",
    oldWay: [
      "Write charges on a travel sheet or remember what you did.",
      "Front desk re-keys them into the {pims} invoice at checkout.",
      "Missed charges (a nail clip, a second injection) are common revenue leakage.",
    ],
    newWay: [
      "Lupa suggests line items from the signed SOAP note and completed tasks.",
      "You approve, remove or adjust suggestions in one screen.",
      "The approved invoice goes straight to front desk for Lupa Pay checkout.",
    ],
    impact: "Clinics recover missed charges that previously never made it onto the invoice.",
    lesson: [
      { heading: "Suggestions come from the record", body: "The AI reads your signed note and task completions. Each suggestion shows why it was suggested (e.g. 'Maropitant given, task 14:00')." },
      { heading: "Remove what didn't happen", body: "If a suggestion wasn't performed (e.g. you discussed bloods but the client declined), remove it. Don't leave it for front desk." },
      { heading: "Plan items are automatic", body: "Items covered by a health plan are zero-rated automatically. Don't discount them manually." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "The AI suggests 'Blood panel' but the client declined bloods. You…",
        options: ["Leave it for front desk to remove", "Remove it before approving", "Approve and refund later", "Discount to $0"],
        correct: 1,
        explain: "Vets own the accuracy of approved charges.",
      },
      {
        id: "q2",
        prompt: "Where do suggested charges come from?",
        options: ["Random", "The signed SOAP note and completed tasks", "Last year's invoice", "Front desk"],
        correct: 1,
        explain: "Suggestions are grounded in the record.",
      },
    ],
    sim: {
      scenario: "You've signed Biscuit's note. Maria declined the blood panel. Approve the correct charges.",
      screens: [
        {
          id: "consult",
          nav: "consult",
          title: "Consult · Biscuit · Signed",
          sections: [
            {
              title: "Suggested charges",
              layout: "table",
              columns: ["Item", "Reason", "Price"],
              items: [
                row("ch-consult", ["Consultation", "Consult completed", "$68.00"]),
                row("ch-maro", ["Maropitant 16mg ×4", "Plan: maropitant", "$42.40"]),
                row("ch-diet", ["Bland diet 2kg", "Plan: bland diet", "$36.00"]),
                row("ch-bloods", ["Blood panel (IDEXX)", "Discussed in consult", "$40.00"], "Review", until("remove")),
                row("ch-rabies", ["Rabies vaccine", "Given · Plan covered", "$0.00"], "Plan"),
              ],
            },
            {
              title: "Actions",
              items: [
                btn("remove", "Remove selected", "danger", after("select")),
                btn("discount", "Apply discount"),
                btn("approve", "Approve & send to front desk", "primary"),
                txt("Invoice #10492 ready for checkout · $146.40", "success", after("approve")),
              ],
            },
          ],
        },
      ],
      steps: [
        {
          id: "select",
          screen: "consult",
          target: "ch-bloods",
          instruction: "Select the charge for the service that did NOT happen.",
          hint: "Maria declined the blood panel.",
          wrong: { approve: "Wait, there's a charge on here for something that didn't happen." },
        },
        { id: "remove", screen: "consult", target: "remove", instruction: "Remove it.", hint: "Remove selected.", wrong: { discount: "Don't discount it to zero. Remove it so the record is accurate." } },
        { id: "approve", screen: "consult", target: "approve", instruction: "Approve the remaining charges and send to front desk.", hint: "Approve & send to front desk." },
      ],
    },
    passScore: 85,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "discharge",
    title: "Discharge & Follow-up",
    category: "Clinical",
    roles: ["vet", "tech"],
    minutes: 6,
    summary: "Send discharge instructions to the client by WhatsApp and schedule a follow-up check automatically.",
    oldWay: [
      "Print a discharge sheet from {pims} (or write it by hand).",
      "Explain everything verbally at the desk; the client forgets half.",
      "Remember to call the client in 3 days… sometimes.",
    ],
    newWay: [
      "Generate discharge instructions from the signed note, in the client's language.",
      "Send them to the client by WhatsApp; they're saved on the timeline.",
      "Schedule an automated follow-up message; replies land in the shared inbox.",
    ],
    impact: "Clients get written instructions every time and follow-ups never slip.",
    lesson: [
      { heading: "Generated from your note", body: "Discharge instructions are generated from the Plan section in plain client-friendly language. Check them, then send." },
      { heading: "Language", body: "Lupa can translate instructions (e.g. Spanish). Pick the client's preferred language, which is stored on the client." },
      { heading: "Automated follow-up", body: "Schedule a follow-up (e.g. 3 days). If the client replies with concerns, the thread is assigned back to you." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "The client prefers Spanish. You…",
        options: ["Send English anyway", "Select Spanish before sending", "Print it", "Ask front desk to translate"],
        correct: 1,
        explain: "Lupa generates instructions in the client's language.",
      },
      {
        id: "q2",
        prompt: "How do you make sure the 3-day check happens?",
        options: ["Sticky note", "Schedule an automated follow-up", "Hope", "Ask the client to call"],
        correct: 1,
        explain: "Automated follow-ups never slip.",
      },
    ],
    sim: {
      scenario: "Biscuit is going home. Maria prefers Spanish. Send discharge instructions and a 3-day follow-up.",
      screens: [
        {
          id: "consult",
          nav: "consult",
          title: "Consult · Biscuit · Signed",
          sections: [
            {
              title: "Discharge",
              items: [
                btn("gen", "Generate discharge instructions", "primary"),
                sel("lang", "Language", ["English", "Español", "Français"], after("gen")),
                txt("Biscuit: dieta blanda durante 3 días, pequeñas porciones… Llámenos si vomita de nuevo.", "ai", after("lang")),
                sel("channel", "Send via", ["Print", "WhatsApp", "Email"], after("lang")),
                sel("followup", "Automated follow-up", ["None", "In 3 days", "In 2 weeks"], after("channel")),
                btn("send", "Send & finish", "primary", after("followup")),
                txt("Sent on WhatsApp · follow-up scheduled for Friday", "success", after("send")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "gen", screen: "consult", target: "gen", instruction: "Generate the discharge instructions.", hint: "Generate discharge instructions." },
        { id: "lang", screen: "consult", target: "lang", value: "Español", instruction: "Maria prefers Spanish. Set the language.", hint: "Español." },
        { id: "channel", screen: "consult", target: "channel", value: "WhatsApp", instruction: "Send it where Maria will see it and it's saved on the timeline.", hint: "WhatsApp." },
        { id: "followup", screen: "consult", target: "followup", value: "In 3 days", instruction: "Schedule the recheck message for 3 days.", hint: "In 3 days." },
        { id: "send", screen: "consult", target: "send", instruction: "Send.", hint: "Send & finish." },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "reports",
    title: "KPI Dashboards & Reports",
    category: "Management",
    roles: ["manager"],
    minutes: 8,
    summary: "Read the live KPI dashboard, drill into a metric and schedule a weekly report.",
    oldWay: [
      "Export CSVs from {pims} at month end.",
      "Build revenue and no-show reports in Excel.",
      "Numbers are weeks old by the time you see them.",
    ],
    newWay: [
      "Live KPI dashboard: revenue, appointments, no-shows, average transaction value.",
      "Drill into any KPI by vet, service or site.",
      "Schedule reports to arrive in your inbox automatically.",
    ],
    impact: "Managers spend their time acting on numbers, not building spreadsheets.",
    lesson: [
      { heading: "Live KPIs", body: "The Reports dashboard updates as invoices and appointments happen. Use the date filter for comparisons." },
      { heading: "Drill down", body: "Click any KPI tile to break it down by vet, appointment type or site." },
      { heading: "Scheduled reports", body: "Any view can be scheduled weekly or monthly to a list of recipients." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "No-shows look high this week. How do you find out which appointment type is affected?",
        options: ["Export to Excel", "Click the No-show KPI and break down by appointment type", "Ask front desk", "Wait for month end"],
        correct: 1,
        explain: "Drill-down answers this in seconds.",
      },
      {
        id: "q2",
        prompt: "How do partners get the numbers every Monday?",
        options: ["You email a screenshot", "Schedule the report weekly", "They log in and look", "Print it"],
        correct: 1,
        explain: "Scheduled reports automate distribution.",
      },
    ],
    sim: {
      scenario: "The partners want to know why no-shows jumped this week, and want a weekly report every Monday.",
      screens: [
        { id: "home", nav: "home", title: "Dashboard", sections: [{ items: [txt("No-shows up 40% vs last week", "warn")] }] },
        {
          id: "reports",
          nav: "reports",
          title: "Reports · This week",
          sections: [
            {
              layout: "table",
              columns: ["KPI", "This week", "vs last"],
              items: [
                row("kpi-rev", ["Revenue", "$48,210", "+6%"]),
                row("kpi-noshow", ["No-shows", "14", "+40%"], "Alert"),
                row("kpi-atv", ["Avg transaction", "$142", "+2%"]),
              ],
            },
            {
              title: "No-shows breakdown",
              items: [
                sel("breakdown", "Break down by", ["Vet", "Appointment type", "Site"], after("open")),
                kv(
                  [
                    ["Vaccination", "9 (reminders off)"],
                    ["Consult", "3"],
                    ["Dental", "2"],
                  ],
                  after("breakdown"),
                ),
                sel("schedule", "Schedule this report", ["Don't schedule", "Weekly · Monday 8am", "Monthly"], after("breakdown")),
                btn("save-schedule", "Save schedule", "primary", after("schedule")),
                txt("Scheduled · partners@riverside.vet every Monday 8am", "success", after("save")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "nav", screen: "home", target: "nav:reports", instruction: "Open Reports.", hint: "Reports is in the top bar." },
        { id: "open", screen: "reports", target: "kpi-noshow", instruction: "Drill into the No-shows KPI.", hint: "The row marked Alert." },
        { id: "breakdown", screen: "reports", target: "breakdown", value: "Appointment type", instruction: "Break it down to see which kind of visit is affected.", hint: "By Appointment type." },
        { id: "schedule", screen: "reports", target: "schedule", value: "Weekly · Monday 8am", instruction: "Schedule this for the partners every Monday.", hint: "Weekly · Monday 8am." },
        { id: "save", screen: "reports", target: "save-schedule", instruction: "Save the schedule.", hint: "Save schedule." },
      ],
    },
    passScore: 80,
  },

  /* ------------------------------------------------------------------ */
  {
    id: "rota",
    title: "Rota & Staff Scheduling",
    category: "Management",
    roles: ["manager"],
    minutes: 7,
    summary: "Build the rota in Lupa so appointment availability always matches who is actually working.",
    oldWay: [
      "Rota lives in a spreadsheet or a paper calendar in the office.",
      "Vet availability is blocked out in {pims} separately, and gets out of sync.",
      "Sickness cover is arranged by group text.",
    ],
    newWay: [
      "Rota is built in Lupa, and online booking availability follows it automatically.",
      "Marking someone absent opens their appointments for reassignment.",
      "Staff see shifts in the mobile app and get notified of changes.",
    ],
    impact: "No more double-booked vets or online bookings into shifts nobody is working.",
    lesson: [
      { heading: "Rota drives availability", body: "If a vet isn't on the rota, clients can't book them online. Keep the rota current." },
      { heading: "Absence", body: "Mark absence on the rota; Lupa lists affected appointments and lets you reassign them in bulk." },
    ],
    quiz: [
      {
        id: "q1",
        prompt: "Dr. Chen calls in sick. First step?",
        options: ["Text the team", "Mark her absent on the rota", "Cancel all appointments", "Nothing"],
        correct: 1,
        explain: "Absence on the rota surfaces affected appointments.",
      },
      {
        id: "q2",
        prompt: "Why must the rota be kept in Lupa?",
        options: ["It's prettier", "Online booking availability follows it", "HR requires it", "It isn't required"],
        correct: 1,
        explain: "Availability is derived from the rota.",
      },
    ],
    sim: {
      scenario: "Dr. Chen calls in sick for today. Handle it in Lupa.",
      screens: [
        { id: "home", nav: "home", title: "Dashboard", sections: [{ items: [kv([["On shift today", "3 vets · 4 techs"]])] }] },
        {
          id: "rota",
          nav: "rota",
          title: "Rota · Today",
          sections: [
            {
              layout: "table",
              columns: ["Staff", "Shift"],
              items: [row("r-chen", ["Dr. Chen", "08:00–18:00"]), row("r-patel", ["Dr. Patel", "08:00–16:00"]), row("r-okoro", ["Dr. Okoro", "12:00–20:00"])],
            },
            {
              title: "Dr. Chen",
              items: [
                sel("absence", "Mark absence", ["Present", "Sick", "Annual leave"], after("open")),
                txt("6 appointments affected", "warn", after("absence")),
                sel("reassign", "Reassign affected appointments to", ["Leave unassigned", "Dr. Okoro (from 12:00) + Dr. Patel", "Cancel all"], after("absence")),
                btn("notify", "Reassign & notify clients", "primary", after("reassign")),
                txt("Appointments moved · clients notified by WhatsApp", "success", after("notify")),
              ],
            },
          ],
        },
      ],
      steps: [
        { id: "nav", screen: "home", target: "nav:rota", instruction: "Open the Rota.", hint: "Rota is in the top bar." },
        { id: "open", screen: "rota", target: "r-chen", instruction: "Open Dr. Chen's shift.", hint: "Dr. Chen's row." },
        { id: "absence", screen: "rota", target: "absence", value: "Sick", instruction: "Mark her as sick.", hint: "Sick." },
        { id: "reassign", screen: "rota", target: "reassign", value: "Dr. Okoro (from 12:00) + Dr. Patel", instruction: "Reassign her appointments to the vets on shift.", hint: "Don't cancel. Reassign to Dr. Okoro + Dr. Patel." },
        { id: "notify", screen: "rota", target: "notify", instruction: "Confirm and notify clients.", hint: "Reassign & notify clients." },
      ],
    },
    passScore: 80,
  },
];

export const MODULE_MAP: Record<string, TrainingModule> = Object.fromEntries(MODULES.map((m) => [m.id, m]));

/** The ordered learning path for each role. Later modules unlock only once earlier ones are passed. */
export const ROLE_PATHS: Record<Role, string[]> = {
  frontdesk: ["fundamentals", "booking", "whatsapp", "checkout", "insurance"],
  tech: ["fundamentals", "intake", "tasks", "inventory", "discharge"],
  vet: ["fundamentals", "intake", "scribe", "charges", "discharge"],
  manager: ["fundamentals", "booking", "checkout", "inventory", "reports", "rota"],
};

export function fillPims(text: string, pims: string): string {
  return text.replaceAll("{pims}", pims);
}
