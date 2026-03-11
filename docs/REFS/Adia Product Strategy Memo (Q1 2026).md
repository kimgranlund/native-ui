# **Adia Health: Product Strategy** 

## **Executive Summary**

Adia Health is building the operating system for continuous, AI-orchestrated healthcare. Our architecture consists of three integrated layers that work together to transform episodic care into a living, adaptive system:

1. **System of Record**: The authoritative source for clinical data, diagnostic reasoning, and care decisions  
2. **Systems of Agents**: Autonomous AI agents that handle communication, coordination, and execution  
3. **System of Intelligence**: The continuous reasoning engine that maintains diagnostic understanding and orchestrates care

Unlike traditional health IT that simply records what happened, we're building infrastructure that captures *why* decisions were made, learns from outcomes, and continuously improves clinical understanding. This isn't just automation—it's the foundation for healthcare that thinks, learns, and evolves.

## **The Three-Layer Architecture**

### **Layer 1: System of Record \- The Clinical Context Graph**

**What We're Building**

Traditional EHRs are systems of record for *objects*: appointments, orders, lab results, billing codes. They capture what happened, but not why it was allowed to happen. The reasoning that drives clinical decisions—the judgment calls, the exceptions, the precedents—exists only in clinicians' heads or buried in unstructured notes.

Adia Health is building something fundamentally different: a **system of record for clinical decisions**. We're creating what leading enterprise AI thinkers call a "context graph"—a living record of decision traces stitched across patients, providers, and time, making clinical precedent searchable and clinical reasoning learnable.

This isn't governance bolted onto existing systems. We're in the execution path where decisions are made, capturing decision traces at commit time—when the clinician approves canceling that MRI, when the care plan adjusts based on new labs, when the exception gets made to standard protocol. That's the only way to build a true context graph.

**Core Components**

**Differential Diagnosis as Data Structure**

* Every patient has a living DDx that exists as structured, queryable data  
* Each diagnosis includes: current probability, supporting evidence, contradicting evidence, change history, and reasoning trail  
* DDx evolves continuously as new data arrives, creating a complete audit trail of how understanding changed over time  
* This isn't buried in clinical notes—it's first-class structured data that drives all downstream decisions

**Decision Traces \- The Core of the Context Graph**

Every clinical decision in Adia creates a structured decision trace that captures:

* **What was decided**: Cancel MRI, order endoscopy, adjust medication dose  
* **Why it was decided**: New celiac antibody result shifted DDx probability from 30% to 85%  
* **What evidence supported it**: Positive tTG-IgA 8x normal, weight loss pattern consistent with malabsorption  
* **What alternatives were considered**: Continue with imaging workup vs. shift to GI-focused pathway  
* **Who made the decision**: Dr. Rodriguez approved AI recommendation at 2:34 PM on Dec 15  
* **What policy governed it**: Standard protocol v2.1 for celiac workup, exception granted for expedited endoscopy  
* **What precedent informed it**: Similar case (Patient \#4521) three months ago where early endoscopy confirmed diagnosis

This isn't just an audit trail. These decision traces become the raw material for learning. When outcomes arrive—endoscopy confirms celiac, patient symptoms resolve, no complications—they link back to the originating decision trace. The system learns: "This decision pattern works. Strengthen confidence for similar future cases."

**Rules vs. Decision Traces**

As enterprise AI researchers note: "Rules tell an agent what should happen in general. Decision traces capture what happened in this specific case—we used X definition, under policy v3.2, with a VP exception, based on precedent Z."

In healthcare:

* **Rules**: "Order lipase for suspected pancreatitis"  
* **Decision trace**: "For a patient with positive celiac serology, Dr. Rodriguez chose to cancel scheduled pancreatitis workup (CT, lipase) because antibody results shifted DDx probability below 10%. This followed precedent from Patient \#4521 where similar lab results led to confirmed celiac diagnosis without need for imaging."

The decision trace captures the nuance that no rule can: the specific context, the reasoning, the precedent that made this decision appropriate *in this case*.

**Human-in-the-Loop Feedback Capture**

* When clinicians approve, modify, or reject AI recommendations, we capture both the action and the reasoning  
* "Why did you override the AI's suggestion to cancel this MRI?" becomes structured feedback  
* Pattern recognition: When Dr. Smith consistently overrides in specific scenarios, that reveals clinical nuance the AI should learn

**Outcomes Data Integration**

* Clinical outcomes: Did the diagnosis prove correct? Did the treatment work? Was the patient admitted?  
* Process outcomes: Was the test actually useful? Did it change management? Was it completed on time?  
* Patient experience: Did the patient understand? Were they satisfied? Did they adhere?  
* Economic outcomes: What did this pathway cost? Could a better path have achieved the same outcome?

**Why This Matters**

This system of record enables something unprecedented: *systematic learning from clinical reasoning*. Every decision becomes training data. Every outcome becomes a feedback signal. The system doesn't just record what happened—it builds understanding of what works, when, and why.

**The Clinical Context Graph Architecture**

A context graph isn't a database of facts. It's a living map of relationships, history, and decisions:

**Identity-Resolved Entities**

* Patients aren't fragmented across systems. Sarah Chen is a canonical entity connected to every encounter, every test, every decision involving her care.  
* Providers are entities with decision patterns: Dr. Rodriguez's approach to celiac workup informs system recommendations.  
* Diagnoses are entities with relationships: celiac disease links to thyroid disorders (associated autoimmune), osteoporosis (malabsorption sequelae), iron deficiency.  
* Treatments are entities with outcomes: metformin \+ lifestyle showed 70% success in similar patient profiles.

**Temporal State**

* What did the DDx look like when this decision was made? We can replay the exact state of knowledge.  
* How has diagnostic probability evolved over time? A graph shows the trajectory, not just the current state.  
* What was the protocol version when this treatment was initiated? Decisions carry forward the context in which they were made.

**Relationship Mapping**

* Which diagnoses commonly co-occur? The graph reveals patterns invisible in structured data alone.  
* Which treatment pathways typically follow specific diagnoses in our patient population?  
* Which exceptions get approved by which clinicians, and under what circumstances?  
* Which test results most strongly shift diagnostic probabilities in practice (not just in theory)?

**Cross-System Synthesis**

* Lab results from Quest link to imaging from the radiology center link to specialist notes from the GI practice link to the patient's symptom diary.  
* The context graph stitches these fragments into coherent clinical understanding.  
* No single system sees the whole picture. The context graph does.

**Why Being in the Execution Path Matters**

Leading enterprise AI thinkers emphasize this point: you can't build a context graph by observing from the outside. You must be where decisions happen.

Adia Health is in the execution path:

* When AI flags unnecessary tests, clinicians approve or reject *in our system*  
* When care plans adjust, the decision and rationale are captured *at commit time*  
* When agents schedule appointments or explain results, those interactions create decision traces *as they happen*  
* When outcomes arrive, they flow through our intelligence layer and link to decisions *automatically*

This is why data warehouses (Snowflake, Databricks) can't build context graphs—they're in the read path, not the write path. They see what happened after the fact, not the reasoning at decision time.

This is why traditional EHRs can't build context graphs—they record the order, but not the exception discussion that led to it, not the precedent that justified it, not the reasoning chain that made it appropriate.

This is why bolt-on decision support can't build context graphs—they make recommendations, but they don't capture whether those recommendations were followed, modified, or rejected, or why.

Adia captures decision traces because we orchestrate execution. That's the foundation of the context graph.

**Technical Implementation: Building the Graph**

The clinical context graph isn't conceptual—it's a concrete technical architecture:

**Event-Sourced Decision Traces**

* Every decision is an immutable event: `DecisionMade`, `DecisionModified`, `DecisionExecuted`, `OutcomeObserved`  
* Complete audit trail with ability to replay exact state at any point in time  
* No data is ever deleted, only appended—the full history of reasoning is preserved

**Graph Database Core**

* Entities (patients, providers, diagnoses, treatments) are nodes  
* Relationships (diagnosed\_with, treated\_by, preceded\_by, similar\_to) are edges  
* Temporal properties on edges: when relationship formed, how it evolved, when it ended  
* Enables queries like: "Show me cases similar to this one where this treatment worked" or "What diagnostic patterns preceded this outcome?"

**Identity Resolution Across Systems**

* Sarah Chen in Epic \= Sarah Chen in lab system \= Sarah Chen in our context graph  
* Provider entities linked across their decisions: Dr. Rodriguez's approval patterns are analyzable  
* Diagnosis entities with standard ontologies (SNOMED, ICD-10) but enriched with local context

**Multimodal Integration**

* Structured data: labs, vitals, orders, billing  
* Unstructured data: clinical notes, patient messages, voice transcripts  
* Agent interactions: every call, message, and coordination task  
* External sources: literature, guidelines, population health data  
* All stitched together in the graph by entity and temporal relationships

**FHIR-Native with Context Graph Extensions**

* Standard FHIR resources for interoperability  
* Custom extensions for decision traces, diagnostic reasoning, precedent links  
* Open API via Model Context Protocol (MCP) so other AI agents can query our context graph  
* Bidirectional: we ingest from other systems, they can query our intelligence

**Real-Time Materialized Views**

* "Current state" views for operational use (what's the DDx right now?)  
* Historical views for learning (how has DDx evolved?)  
* Pattern recognition views (what diagnosis patterns appear in high-risk patients?)  
* Precedent views (show me similar cases with outcomes)

This architecture ensures that every piece of clinical work—every decision, every coordination, every outcome—contributes to a growing body of organizational intelligence that makes every subsequent decision better.

## **The Two Clocks Problem in Healthcare**

**Why Healthcare Context Graphs Don't Exist Today**

Every healthcare organization pays what we call a **fragmentation tax**: the cost of manually stitching together context that was never captured in the first place. Labs, imaging centers, specialists, pharmacies—each has a partial view of the same patient. Clinicians spend enormous time reconstructing the full picture through chart review, phone calls, and records requests.

A context graph is infrastructure to stop paying that tax. But to build one, you first have to understand why the tax exists.

**State vs. Events: Healthcare's Missing Half**

There's an intuition that helps explain why this is hard: we've built all our systems around only half of time.

Your EHR stores the current medication list, not the three failed drugs that preceded it. Your problem list stores "diabetes mellitus," not the diagnostic reasoning that ruled out secondary causes. Your care plan stores "order lipase," not the differential diagnosis that made pancreatic evaluation necessary.

**We've built trillion-dollar infrastructure for what's true now. Almost nothing for why it became true.**

This made sense when humans were the reasoning layer. The clinical brain was distributed across physician heads, reconstructed on demand through hallway conversations and curbside consults. Now we want AI systems to make care decisions, and we've given them nothing to reason from. We're asking models to exercise clinical judgment without access to precedent.

**The Two Clocks in Clinical Care**

Every clinical system has two clocks:

**State Clock**: What's true right now

* Current medications, active problems, recent vitals, pending orders  
* This is what EHRs excel at capturing  
* Easy to query: "What's the patient's current blood pressure?"

**Event Clock**: What happened, in what order, with what reasoning

* Why was Drug A stopped? (Side effects? Ineffective? Insurance denial?)  
* What evidence led to changing the differential? (New lab? Specialist opinion? Symptom evolution?)  
* Why was this exception to protocol approved? (Patient-specific contraindication? Precedent from a similar case?)  
* This is what EHRs completely miss  
* Almost impossible to query: "Show me cases where we stopped Drug A for the same reason"

**Clinical Examples of Lost Reasoning**

*The order says "cancel CT scan." Doesn't say the celiac antibodies came back positive, making pancreatic imaging unnecessary, saving $2,400 and avoiding radiation exposure.*

*The problem list says "removed: suspected pancreatitis." Doesn't say the diagnosis was ruled out by positive celiac serology, creating precedent for future patients with similar presentations.*

*The treatment plan says "start a gluten-free diet." Doesn't say this is based on confirmed celiac disease, not empiric trial, meaning adherence is critical and monitoring with repeat serology is appropriate.*

State overwrites. The current care plan replaces the previous one. Events must append—they're the history of how understanding evolved. And the most important part of the event clock—the reasoning connecting observations to actions—was never treated as data. It lived in heads, hallway conversations, and unstructured notes that can't be queried.

**Why This Is Structurally Hard**

Building an event clock for clinical care is harder than most domains:

**Most clinical systems aren't fully observable.** Any real care delivery system has black boxes: legacy EHRs with opaque logic, third-party services (labs, imaging), emergent behavior across fragmented systems. You can't capture reasoning about things you can't see—yet clinical decisions depend on information from all these sources.

**There's no universal clinical ontology.** Every organization has its own workflows, specialists, protocols, patient populations. "Celiac workup" means different things at an academic medical center versus a community practice. The context graph can't assume structure; it has to learn it from actual care patterns.

**Everything is changing constantly.** The system you're modeling changes daily. New labs available, new specialists join, treatment guidelines update, insurance policies shift. You're not documenting a static reality—you're tracking a living, evolving system.

Most "clinical knowledge management" projects fail because they treat this as a static problem: extract data from the EHR, build a knowledge graph, query it later. But those extracts are frozen. The event clock requires a capturing process, and the process is dynamic.

**How Adia Solves This: Agents as Clinical Trajectory Samplers**

The ontology problem looks unsolvable at first. Every organization is different. You can't standardize "how clinical decisions work" any more than you can standardize "how hospitals work."

But there's something that navigates arbitrary clinical systems by definition: **agents**.

When an Adia agent works through a clinical problem—investigating symptoms, coordinating workup, adjusting treatment—it figures out the relevant ontology on the fly:

* Which providers matter for this patient?  
* How do diagnoses relate? (Celiac → check for thyroid disease, osteoporosis)  
* What information do I need? (Recent labs, imaging, specialist notes)  
* What actions are available? (Order tests, schedule appointments, modify care plan)

**The agent's trajectory through the problem is a trace through clinical state space.** It's an implicit map of the ontology, discovered through use rather than specified upfront.

Consider two patients with abdominal pain. One trajectory goes: symptoms → initial labs → positive celiac serology → cancel imaging → order endoscopy → nutritionist referral. Another goes: symptoms → initial labs → elevated lipase → CT scan → pancreatitis diagnosis → pain management protocol.

These trajectories reveal structure:

* Which tests co-occur in diagnostic pathways?  
* Which symptoms lead to which workups?  
* Which diagnosis triggers which downstream actions?  
* Which exceptions get approved and under what circumstances?

**Structural Embeddings, Not Semantic Embeddings**

Typical clinical embeddings are semantic: "pancreatitis" and "celiac disease" are nearby vectors because they both involve abdominal pain. That's useful for search, not for what we need.

We need embeddings that encode **clinical structure**—not "these diagnoses mean similar things" but "these diagnoses play similar roles in decision chains" or "these tests co-occur in workups."

The information isn't about meaning. It's about the **shapes of clinical reasoning**:

* Which entities get touched together when solving diagnostic problems?  
* Which test results most strongly shift differential probabilities?  
* What are the traversal patterns through clinical decision space?

There's a concept from graph representation learning that's helpful: you don't need to know graph structure upfront to learn representations of it. Accumulate enough traversals (agent trajectories through clinical problems) and the representation emerges from co-occurrence patterns.

**Agents as Informed (Not Random) Walkers**

Unlike random walks through data, agent trajectories are problem-directed. The agent adapts based on what it finds:

* Investigating abdominal pain, it starts broad: What's the differential? What initial workup is appropriate? (Global exploration)  
* As evidence accumulates—positive celiac antibodies—it narrows: Cancel unnecessary tests, order confirmatory workup, arrange specialist care. (Local exploitation)

**Accumulate thousands of these trajectories and you get a learned representation of how clinical care actually works**—not how protocols say it should work, but how problems are actually solved, which shortcuts are safe, which exceptions are appropriate, which precedents matter.

The ontology emerges from clinical work. Tests ordered repeatedly for specific symptoms matter. Relationships traversed (celiac → nutritionist referral) are real. Structural equivalences reveal themselves when different agents solving different problems follow analogous paths (two diabetic patients, different presentations, converge on similar treatment optimization).

**Economic Elegance**

The agents aren't building the context graph as their primary job—they're coordinating care, communicating with patients, scheduling appointments. The context graph is the **exhaust from doing work worth paying for**.

Better context makes agents more capable → capable agents get deployed more → deployment generates trajectories → trajectories build context. The flywheel only works if agents do work that justifies the compute.

### **Layer 2: Systems of Agents \- The Autonomous Workforce**

**What We're Building**

Healthcare drowns in coordination overhead. Every care plan requires dozens of phone calls, messages, scheduling tasks, and follow-ups. We're replacing this human-intensive coordination with autonomous AI agents that handle 80-90% of administrative and communication work.

**Agent Types**

**Patient Communication Agents**

* Inbound call handling: Scheduling, symptom triage, prescription refills, general questions  
* Outbound patient contact: Results explanation, appointment reminders, care plan changes, adherence check-ins  
* Adaptive communication: Adjusts to health literacy level, emotional state, language preference, and urgency  
* Context-aware: Every interaction draws from current DDx and care plan state

**Care Coordination Agents**

* Provider-to-provider: Specialist referrals with clinical context, results retrieval, care transition coordination  
* Facility coordination: Imaging center scheduling, lab follow-up, procedure authorization  
* Prior authorization: Document gathering, submission, follow-up, appeal management  
* Insurance verification: Benefits check, eligibility confirmation, coverage determination

**Clinical Workflow Agents**

* Order management: Test ordering, result monitoring, critical value alerts, order reconciliation  
* Medication management: Prescription routing, refill coordination, formulary checking, drug interaction monitoring  
* Documentation assistance: Note generation from voice, billing code suggestion, quality measure tracking  
* Care gap identification: Screening due dates, preventive care reminders, quality program requirements

**How Agents Work**

**Goal-Oriented Autonomy**

* Agents receive objectives (e.g., "Schedule endoscopy within 2 weeks with Dr. Patel")  
* They autonomously determine actions needed: Check schedule availability, verify insurance, contact patient, confirm appointment, send prep instructions, coordinate transportation if needed  
* Agents handle obstacles: If Dr. Patel is booked, try Dr. Kim. If patient doesn't answer, leave message, send text, try again tomorrow  
* Success criteria define completion, not step-by-step instructions

**Multi-Agent Coordination**

* Agents collaborate on complex tasks: Patient communication agent coordinates with scheduling agent and prior authorization agent  
* Shared state management: All agents operate on same real-time view of patient status  
* Handoff protocols: When human intervention needed, agents package context and route appropriately  
* Conflict resolution: When agents have competing priorities, system-level intelligence mediates

**Learning and Improvement**

* Agents track success metrics: Call resolution rate, patient satisfaction, task completion time, escalation frequency  
* Pattern recognition: Which communication approaches work best? When do patients prefer calls vs. texts?  
* A/B testing built in: Try different approaches, measure outcomes, optimize continuously  
* Human feedback integration: When staff corrects agent actions, those corrections become training signals

**Agent-Human Collaboration Model**

Agents handle:

* Routine scheduling and coordination (90%+ of volume)  
* Information retrieval and delivery  
* Process execution following approved care plans  
* Pattern recognition and alerting  
* Documentation and data entry

Humans handle:

* Complex clinical judgment  
* Empathetic connection in difficult conversations  
* Novel situations requiring creativity  
* High-stakes decisions with ambiguity  
* Quality oversight and spot-checking

The division isn't rigid—agents escalate when confidence is low or stakes are high, and humans can always override.

### **Layer 3: System of Intelligence \- The Continuous Reasoning Engine**

**What We're Building**

Traditional clinical decision support is reactive: clinician places an order, system checks for drug interactions. We're building something proactive: a reasoning engine that continuously evaluates patient state, maintains diagnostic probabilities, identifies care plan implications, and proposes intelligent adjustments—24/7, for every patient.

**Core Intelligence Capabilities**

**Continuous Differential Diagnosis Maintenance**

* Probabilistic reasoning: Bayesian updating as new evidence arrives  
* Multi-hypothesis tracking: Simultaneously maintain competing diagnostic theories  
* Evidence weighting: Clinical findings, lab results, imaging, and patient-reported symptoms weighted by reliability  
* Temporal reasoning: Symptom onset, progression patterns, and timing inform probability shifts  
* Uncertainty quantification: System knows what it doesn't know and where additional data would help most

**Care Plan Coherence Analysis**

* Alignment checking: Every scheduled test, referral, and medication evaluated against current DDx  
* Downstream impact modeling: When DDx changes, identify all affected care plan elements  
* Waste detection: Tests unlikely to change management, procedures targeting low-probability diagnoses  
* Gap identification: Missing workup elements for high-probability diagnoses  
* Priority ranking: Among possible actions, which matter most right now?

**Predictive Analytics**

* Risk stratification: Which patients are trending toward decompensation, admission, or complications?  
* Adherence prediction: Based on patterns, who's likely to miss appointments or stop medications?  
* Response forecasting: Given patient characteristics and condition, predict treatment response  
* Utilization prediction: Forecast which patients will be high-cost next quarter  
* Intervention targeting: Where will proactive outreach prevent problems?

**Evidence Synthesis**

* Literature integration: Latest clinical guidelines and research inform probability assessments  
* Local practice patterns: Learn what works in *this* population with *this* provider group  
* Comparative effectiveness: Among treatment options, what actually performs best here?  
* Population insights: Patterns across patient cohort inform individual care

**How Intelligence Drives Action**

The intelligence layer doesn't just analyze—it *orchestrates*:

1. **New data arrives** (lab result, symptom report, vital sign change)  
2. **Intelligence layer updates DDx** (recalculates probabilities, identifies implications)  
3. **Care plan impact assessed** (finds misalignments, waste, or gaps)  
4. **Recommendations generated** (specific, actionable, with supporting reasoning)  
5. **Human review triggered** (clinician sees alert with context and one-click approval options)  
6. **Upon approval, agents execute** (cancel unnecessary test, schedule new workup, notify patient)  
7. **Outcomes tracked** (link back to decision, update learning models)

**The Context Graph Learning Flywheel**

This is where the three layers create compounding value through the clinical context graph:

* **System of Record** captures every decision trace (not just outcomes, but reasoning, exceptions, precedents)  
* **System of Intelligence** analyzes patterns across thousands of decision traces, learning what works, when, and why  
* **Learning insights** improve future recommendations: "In cases like this, with this evidence pattern, this decision pathway has 85% success rate"  
* **Agents execute** improved care pathways more effectively, creating more decision traces with better outcomes  
* **Better outcomes** generate higher-quality training data, strengthening the context graph  
* **Cycle repeats**, with each decision making the next one smarter

**This is the trillion-dollar opportunity identified by leading AI researchers**: each patient benefits from the collective learning of the entire population. Each clinician's expertise—captured as decision traces—becomes available to all patients. The context graph grows richer with every decision, more accurate with every outcome, more valuable with every user.

Traditional systems of record store objects. Context graphs store *organizational intelligence*. The difference in value creation is profound.

**Network Effects Through the Context Graph**

The clinical context graph creates powerful network effects:

**Cross-Provider Learning**

* Oncologist in Boston makes exception to approve experimental treatment for rare cancer → decision trace captured with reasoning  
* Similar case appears in Austin six months later → system surfaces precedent: "In case \#8921, Dr. Patel approved a similar exception. Patient outcome: complete response at 6 months. This precedent informed the decision."  
* The network learns from each decision, making every clinician smarter

**Population-Level Pattern Recognition**

* Small practices see too few cases to recognize patterns  
* Context graph aggregates across entire network: "Among patients with this symptom cluster and lab profile, 73% had diagnosis X, but only when symptom Y preceded lab change Z by \>2 weeks"  
* Patterns invisible in small samples emerge at scale

**Precedent as Product**

* "Show me similar cases" becomes a product feature powered by the context graph  
* Clinicians see how others handled ambiguous situations, complete with outcomes  
* Best practices emerge organically from decision traces, not top-down guidelines

## **Context Graphs as Clinical World Models**

**Beyond Retrieval: Simulation and Counterfactual Reasoning**

A context graph with enough accumulated structure becomes more than a database. It becomes a **world model**—a learned, compressed representation of how clinical care actually works.

A world model encodes:

* **Dynamics**: What happens when you take actions in specific clinical states  
* **Structure**: What entities exist (diagnoses, treatments, providers) and how they relate  
* **Prediction**: Given a current state and a proposed action, what happens next?

This concept reframes what context graphs actually are. They're not just memory systems. They're **simulators for clinical decision-making**.

**Clinical Physics vs. Physical Physics**

In robotics, world models capture physics—how objects fall, how forces propagate. This lets you simulate robot actions before executing them, train policies in imagination, explore dangerous scenarios safely.

The same logic applies to healthcare, but the physics is different.

**Clinical physics isn't mass and momentum. It's decision dynamics:**

* How do diagnostic probabilities shift with new evidence?  
* How do treatment adjustments propagate through care plans?  
* What happens when you change this medication while that condition is active?  
* What's the cascade when you cancel this test given current differential?

State tells you what's true. The event clock tells you how the system behaves—and **behavior is what you need to simulate**.

**What Clinical Simulation Enables**

Once the context graph accumulates enough decision traces, you can ask counterfactual questions:

**"What if we order the CT scan despite positive celiac serology?"**

* Context graph has seen 47 similar cases  
* In 45 cases, imaging showed nothing (diagnostic yield 4.3%)  
* Average cost: $2,400, radiation exposure: 14 mSv  
* In 2 cases with positive findings, both had additional red flags not present here  
* Simulation output: Low expected value, high cost, proceed with GI-focused workup instead

**"What if we start metformin now versus wait for a lifestyle modification trial?"**

* Context graph knows this patient's profile: A1c 7.2%, BMI 28, age 52, no kidney disease  
* Similar patients who started metformin immediately: 73% achieved target A1c within 6 months  
* Similar patients who tried lifestyle first: 41% achieved target without medication, 59% eventually needed metformin anyway (average delay: 4.3 months)  
* Simulation output: Starting metformin now has 73% success rate, lifestyle trial has effective 41% success (59% × delayed success not modeled), recommend shared decision-making with patient preference

**"Which specialist should we refer to for this complex case?"**

* Context graph knows referral patterns and outcomes  
* Dr. Patel (GI): 23 similar referrals, average time-to-diagnosis 12 days, 87% patient satisfaction  
* Dr. Kim (GI): 31 similar referrals, average time-to-diagnosis 8 days, 91% patient satisfaction, but 3-week wait for appointments  
* Simulation considers urgency, wait times, and match quality  
* Recommendation: Dr. Kim if patient can wait, Dr. Patel for faster access

These simulations aren't magic. They're **inference over accumulated structure**. We've watched enough trajectories through clinical problems to learn patterns—which diagnostic pathways are high-yield, which treatment combinations work, which coordination sequences prevent delays.

**Simulation is the test of understanding.** If your context graph can't answer "what if," it's just a search index.

**Clinical Intelligence That Compounds Without Retraining**

There's a deeper implication here for how AI systems improve over time.

The standard framing asks: how do we update model weights from ongoing clinical experience? That's hard—catastrophic forgetting (the model forgets previous knowledge), distributional shift (new data looks different), expensive retraining.

World models suggest an alternative: **keep the model fixed, improve the world model it reasons over**.

This is what Adia does with accumulated context graphs:

* Each agent trajectory is evidence about clinical dynamics (how care actually unfolds)  
* Each decision trace links actions to outcomes (what works, what doesn't)  
* At decision time, perform inference over this evidence: Given everything captured about how this system behaves, given current observations, what's the posterior probability over diagnoses? What actions succeed?

**More trajectories → better inference.** Not because the model updated its weights, but because the world model expanded its evidence base.

And because the world model supports simulation, you get something more powerful: **counterfactual reasoning**. Not just "what happened in similar situations?" but "what would happen if I took this action?"

**This is what experienced clinicians have that residents don't.** Not different cognitive architecture—a better world model. They've seen enough cases to simulate outcomes:

*"If we discharge this patient now, they'll bounce back within 48 hours."*

That's not retrieval from a similar case. It's inference over an internal model of disease progression, social determinants, and system behavior.

**The Path to Transformative Clinical AI**

The path to economically transformative clinical AI might not require solving continual learning. It might require building world models that let AI systems behave as if they're learning, through:

* Expanding evidence bases (more decision traces)  
* Inference-time compute to reason over accumulated context  
* Simulation capabilities to evaluate hypotheticals before committing

**The AI model is the engine. The clinical context graph is the world model that makes the engine useful.**

At Adia, this means:

* Our language models don't need retraining to get smarter about local care patterns  
* They reason over an ever-expanding context graph of decision traces  
* They simulate outcomes by querying learned patterns of what works  
* They improve automatically as more care gets coordinated through the system

**Intelligence that compounds, not through retraining, but through accumulated organizational learning captured as decision traces.**

## **Adia as a System of Action Built on a Clinical Context Graph**

**The Next Layer Above Systems of Record**

Leading enterprise AI thinkers identify an emerging category: **systems of action** \- AI-native layers that turn user intent into execution across tools. They sit above systems of record, orchestrate multi-step work, and improve over time by learning from decisions, exceptions, and outcomes.

Adia Health is a system of action for healthcare. But unlike most enterprise AI that lives as a bolt-on, we're architected from the ground up to:

**Capture Intent, Not Just Transactions**

* "This patient needs celiac workup" isn't a checkbox. It's intent that spawns orchestrated execution: order tests, schedule endoscopy, refer to nutritionist, arrange follow-up  
* Traditional EHRs capture that orders were placed. We capture why those specific orders made sense for this patient at this time

**Orchestrate Multi-Step Execution**

* When celiac antibodies come back positive, intent shifts: "Confirm diagnosis, cancel unnecessary workup, start appropriate treatment"  
* System decomposes into steps across multiple systems: cancel imaging at radiology center, order endoscopy at GI practice, schedule nutritionist, notify patient  
* Agents execute across these systems while the context graph captures the decision trail

**Coordinate Humans and Software**

* AI proposes: "Cancel MRI based on new celiac diagnosis"  
* Human decides: Dr. Rodriguez reviews reasoning and approves  
* Software executes: Agents cancel appointment, notify patient, update care plan  
* Context graph captures: The decision trace, the human approval, the execution outcome  
* This coordination pattern is the essence of a system of action

**Learn from Decisions and Outcomes**

* Traditional systems stop at "task completed"  
* Systems of action learn: Did this decision pathway lead to good outcomes? What variations work better?  
* The clinical context graph makes this learning systematic rather than anecdotal

**Why Most "AI Agents" Aren't Real Systems of Action**

As enterprise AI researchers note, most enterprise AI lives as add-ons \- useful, but not the execution layer. They don't control the action surface where real work happens.

Adia is different because:

* We're in the execution path where care decisions are made and executed  
* Our agents don't just suggest—they coordinate, schedule, communicate, and execute (with human approval for clinical decisions)  
* We capture decision traces at commit time, not through post-hoc analysis  
* Our context graph grows richer with every decision, making the system smarter automatically

**The Clinical Context Graph as Foundation**

You can't build a system of action without a context graph. Leading enterprise AI thinkers are explicit: "You need a living map of relationships, history, and decisions to execute reliably across systems and time."

In healthcare, executing reliably means:

* Knowing which tests were already done (avoid duplication)  
* Understanding why previous treatments failed (inform current decisions)  
* Recognizing which exceptions were granted and why (precedent for similar cases)  
* Tracking which coordination approaches work best (optimize execution)

The clinical context graph provides this foundation. Every agent execution creates decision traces that make future executions smarter. Every clinician approval strengthens the patterns the system learns. Every patient outcome closes the loop between decision and result.

This is why Adia can be a true system of action: we're not orchestrating blindly. We're orchestrating with deep, learned context about what works, when, and why.

**Initial Presentation**

Sarah, 52, presents with abdominal pain and weight loss. Dr. Rodriguez examines her and uses voice documentation that flows into the System of Record.

**System of Record**: Creates structured patient encounter, captures clinical reasoning for initial DDx (pancreatic cancer, chronic pancreatitis, celiac disease), records care plan with rationale for each order

**System of Intelligence**: Analyzes presentation against knowledge base, validates DDx is comprehensive, confirms workup aligns with clinical guidelines, flags Sarah for monitoring given symptom severity

**Systems of Agents**:

* Scheduling agent coordinates CT, MRI, and lab appointments  
* Patient communication agent calls Sarah to explain each test's purpose and prep requirements  
* Insurance agent verifies coverage and initiates prior authorizations  
* Clinical workflow agent sets up result monitoring with automatic alerts

**Day 2: Lab Result Arrives**

Tissue transglutaminase antibodies return strongly positive.

**System of Intelligence**:

* Updates DDx probabilities (celiac 85%, pancreatitis 8%, pancreatic cancer 5%)  
* Analyzes care plan: CT and MRI now targeting diagnoses with combined probability \<15%  
* Calculates expected value of proceeding vs. canceling (minimal diagnostic yield, $3,500 cost, radiation exposure)  
* Generates recommendation: "Cancel CT and MRI, order endoscopy for biopsy confirmation, add nutritionist referral and bone density scan"  
* Presents to Dr. Rodriguez with supporting evidence and decision logic

**System of Record**:

* Captures recommendation with full reasoning trail  
* Records Dr. Rodriguez's approval with timestamp  
* Links decision to triggering lab result and DDx update  
* Marks CT and MRI as "canceled \- diagnosis confirmed, no longer indicated"

**Systems of Agents** (execute within 30 minutes):

* Order management agent cancels imaging appointments, notifies facilities  
* Scheduling agent books endoscopy and nutritionist appointment  
* Patient communication agent calls Sarah with voice explanation  
* Care coordination agent updates referring gastroenterologist with new plan  
* Documentation agent updates care plan across all integrated EHR systems

**Sarah's Experience**:

Within 4 hours of her lab result being available, she receives a phone call explaining everything clearly, unnecessary tests are canceled, appropriate new tests are scheduled, and she knows exactly what happens next. She didn't have to wait for a follow-up appointment or navigate confusing portal messages. The system acted.

**6 Months Later: Learning Loop Closes**

Sarah's endoscopy confirms celiac disease. Her nutritionist-guided dietary changes resolve symptoms. She didn't require a CT or MRI. This outcome flows back into the system:

**System of Record**: Links Sarah's case to the cancellation decision, records successful outcome

**System of Intelligence**: Updates learning models:

* Strengthens confidence in celiac antibody test as definitive  
* Reinforces appropriateness of canceling advanced imaging in this scenario  
* Identifies successful clinical pathway: positive serology → endoscopy → nutrition → symptom resolution  
* This pattern now informs recommendations for future patients with similar presentations

The next patient with positive celiac antibodies benefits from Sarah's case—the system is more confident in its recommendations, care teams trust the AI's judgment more, and unnecessary testing is avoided more systematically.

## **Product Roadmap: Building the Layers**

### **Phase 1: Foundation (Months 1-12)**

**MVP of System of Record**

* Structured DDx data model and API  
* FHIR integration with major EHRs  
* Decision provenance capture  
* Basic outcomes linkage

**Agent Prototype**

* Patient communication agent (voice \+ text)  
* Inbound call handling for scheduling and basic triage  
* Outbound result notification

**Intelligence Demonstrator**

* Rule-based DDx probability updates  
* Simple care plan coherence checking  
* Alert generation for misalignments

**Target**: Single pilot practice, demonstrate end-to-end workflow for common scenarios

### **Phase 2: Learning Infrastructure (Months 13-24)**

**Enhanced System of Record**

* Human feedback capture and annotation  
* Outcome tracking across care episodes  
* Multi-provider coordination data  
* Quality measure and risk adjustment integration

**Agent Expansion**

* Care coordination agents (provider-to-provider)  
* Prior authorization automation  
* Medication management agents  
* Multi-channel communication (voice, text, email, portal)

**Intelligence Advancement**

* Machine learning models for DDx probability  
* Predictive analytics for risk stratification  
* Personalized care pathway recommendations  
* A/B testing infrastructure

**Target**: 3-5 practices with 50+ providers, demonstrate measurable outcomes (waste reduction, gap closure, cost savings)

### **Phase 3: Scale and Sophistication (Months 25-36)**

**System of Record Maturity**

* Population health dashboards  
* Research-grade data export  
* Multi-organization data federation  
* Real-time guideline integration

**Agent Orchestration**

* Multi-agent coordination framework  
* Complex workflow automation  
* Integration with external services (labs, pharmacies, payers)  
* Multilingual and culturally-adapted communication

**Intelligence Platform**

* Continuous learning from all deployments  
* Causal inference for treatment effectiveness  
* Generative AI for documentation and patient education  
* Transfer learning across specialties

## **Key Product Principles**

### **1\. AI-Augmented, Not AI-Replaced**

Clinicians retain decision authority. AI proposes, humans dispose. Every care plan change requires human approval, but approval should take 10 seconds, not 10 minutes.

### **2\. Radical Transparency**

Patients and families see the same information as providers (translated to appropriate literacy level). No information asymmetry. Shared understanding drives shared decision-making.

### **3\. Learning by Default**

Every interaction, every decision, every outcome becomes training data. The system gets smarter automatically, without requiring clinician effort to "feed" it.

### **4\. Graceful Degradation**

If agents fail, humans can step in. If the intelligence layer fails, underlying record and coordination still work. No single point of failure disrupts care delivery.

### **5\. Open Where Possible, Proprietary Where It Matters**

* Open standards (FHIR, MCP) for interoperability  
* Open APIs for third-party agent integration  
* Open data export for patients and researchers  
* Proprietary diagnostic reasoning models trained on our unique feedback data

## **Risks and Mitigation**

### **Clinical Safety Risk**

**Risk**: AI makes incorrect recommendation, clinician approves without scrutiny, patient harmed **Mitigation**:

* Always require explicit human approval for care plan changes  
* Surface confidence levels with recommendations  
* Track override patterns and flag when AI is frequently wrong in specific scenarios  
* Maintain comprehensive audit trails for retrospective review  
* Build "safe" vs. "needs scrutiny" categorization into recommendation engine

### **Agent Reliability Risk**

**Risk**: Voice agent misunderstands patient, miscommunicates information, or fails to escalate appropriately **Mitigation**:

* Human-in-the-loop for high-stakes conversations (bad news, complex diagnosis)  
* Confidence thresholds for escalation  
* Quality monitoring with random sampling of interactions  
* Patient override: always offer "speak to a person" option  
* Incremental rollout: start with low-risk interactions, expand as reliability proven

### **Data Quality Risk**

**Risk**: Garbage in, garbage out—if underlying EHR data is poor, our intelligence layer can't work **Mitigation**:

* Structured data capture at point of care (voice documentation that creates structured data)  
* Validation rules and completeness checking  
* Feedback loops that identify and correct data quality issues  
* Don't rely solely on existing EHR data—capture our own structured diagnostic reasoning

### **Regulatory Risk**

**Risk**: FDA classifies system as medical device, requiring lengthy approval process **Mitigation**:

* Design as clinician augmentation tool, not autonomous diagnostic system  
* Maintain human final authority on all clinical decisions  
* Engage regulatory counsel early  
* If necessary, pursue de novo pathway for novel clinical decision support

### **Adoption Risk**

**Risk**: Clinicians don't trust AI recommendations, don't change workflows, system creates work instead of reducing it **Mitigation**:

* Start with high-confidence, low-controversy recommendations (obvious waste)  
* Show work: always explain reasoning transparently  
* Quick wins: demonstrate time savings and reduced hassles early  
* Champion identification: find early adopters who become internal advocates  
* Workflow integration: embed into existing tools rather than require separate logins

## **Why Now?**

Three conditions must exist simultaneously for this to work. All three are now true for the first time:

**1\. AI Capability Threshold** Large language models can now conduct clinically sound reasoning, communicate naturally with patients, and handle ambiguous real-world conversations. Five years ago, the AI wasn't ready. Today, it is.

**2\. Economic Necessity** Value-based care is no longer experimental—it's the dominant payment model trajectory. Practices must master diagnostic completeness and care efficiency to survive. The old model is economically dying.

**3\. Interoperability Reality** FHIR APIs, standardized data models, and regulatory requirements make it feasible to build integrated systems across fragmented tech stacks. Ten years ago, integration costs would have been prohibitive. Today, they're manageable.

The window is open now. In 2-3 years, incumbents will attempt similar architectures. Our advantage is moving first while the technology is mature enough to work but before the market is crowded.

## **Conclusion: Building Healthcare's Intelligence Layer**

Adia Health isn't a feature or a tool. It's infrastructure—the intelligence layer that healthcare has never had.

**We're building a clinical context graph**: a living system of record for decisions, not just objects. Where every care decision creates a structured trace. Where reasoning becomes searchable. Where precedent becomes a product. Where organizational intelligence compounds with every case.

Our three-layer architecture creates something unprecedented:

* A **system of record** that captures not just what happened, but why it was allowed to happen—decision traces that become the raw material for learning  
* **Agents** that handle the overwhelming coordination burden, freeing humans for judgment, while creating more decision traces through their execution  
* **Intelligence** that never stops thinking about every patient, learning from every decision, strengthening the context graph with every outcome

The result is healthcare that finally operates at the speed of information rather than the speed of appointment scheduling. Care that learns systematically from decision traces rather than anecdotally from anecdotes. Administration that costs 10% of current levels rather than consuming 30% of practice resources.

**This is the emerging insight in enterprise AI**: The next trillion-dollar opportunity isn't better AI models. It's capturing the decision context that enterprises have never systematically stored. It's building systems of record for decisions, not just objects. It's creating context graphs that make organizational intelligence searchable, learnable, and compoundable.

Healthcare is uniquely positioned for this transformation because:

* Clinical decisions are high-stakes and high-value—the cost of capturing them is justified  
* Outcomes are measurable and meaningful—we can close the learning loop  
* Precedent matters enormously—"how did we handle this last time?" is a constant question  
* Coordination complexity is overwhelming—agents can handle it, creating decision traces in the process

The practices that deploy Adia will have an overwhelming advantage in value-based contracts. The patients they serve will experience healthcare that feels responsive, coordinated, and personalized. The clinicians using it will wonder how they ever functioned without searchable precedent and autonomous coordination.

We're not just building software. We're building the clinical context graph—the system of record for healthcare intelligence itself.

**Adia Health: Where clinical reasoning becomes structured data, decisions become searchable precedent, coordination becomes autonomous, and organizational intelligence compounds with every case.**

