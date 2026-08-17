import { auth } from "@clerk/nextjs/server";
import {
	ArrowRight,
	CheckSquare,
	ChevronRight,
	Kanban,
	Users,
	Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/header";
import { ScrollReveal } from "@/components/scroll-reveal";

function GlowBackground() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			<div
				className="absolute rounded-full blur-[120px]"
				style={{
					width: "70%",
					height: "70%",
					top: "5%",
					left: "15%",
					background:
						"radial-gradient(ellipse, rgba(147,197,253,0.35) 0%, rgba(96,165,250,0.2) 45%, transparent 70%)",
					animation: "glow-float 12s ease-in-out infinite",
				}}
			/>

			<div
				className="absolute rounded-full blur-[100px]"
				style={{
					width: "45%",
					height: "45%",
					top: "-5%",
					right: "-5%",
					background:
						"radial-gradient(ellipse, rgba(56,189,248,0.25) 0%, rgba(14,165,233,0.12) 55%, transparent 75%)",
					animation: "glow-drift 18s ease-in-out infinite",
					animationDelay: "-4s",
				}}
			/>

			<div
				className="absolute rounded-full blur-[90px]"
				style={{
					width: "38%",
					height: "38%",
					bottom: "0%",
					left: "-5%",
					background:
						"radial-gradient(ellipse, rgba(99,102,241,0.2) 0%, rgba(147,197,253,0.12) 55%, transparent 75%)",
					animation: "glow-pulse 10s ease-in-out infinite",
					animationDelay: "-7s",
				}}
			/>
		</div>
	);
}

const features = [
	{
		icon: Kanban,
		title: "Drag & Drop Boards",
		description:
			"Visualize your workflow with intuitive Kanban boards. Move tasks between columns seamlessly — no friction, just flow.",
	},
	{
		icon: Users,
		title: "Team Collaboration",
		description:
			"Invite your team, assign tasks, and keep everyone aligned. Real-time updates keep the whole crew in sync.",
	},
	{
		icon: CheckSquare,
		title: "Task Management",
		description:
			"Create, organize, and prioritize tasks with ease. Deadlines, statuses, and details — all in one focused place.",
	},
];

const steps = [
	{
		number: "01",
		title: "Create a Project",
		description:
			"Set up a project in seconds. Give it a name, describe the goal, and you're ready to go.",
	},
	{
		number: "02",
		title: "Add Tasks",
		description:
			"Break your project into actionable tasks. Assign them, set priorities, and organize them into clear columns.",
	},
	{
		number: "03",
		title: "Ship Faster",
		description:
			"Track progress in real time, unblock your team, and deliver your work with confidence.",
	},
];

export default async function HomePage() {
	const { userId } = await auth();

	return (
		<div className="min-h-screen bg-background text-foreground">
			<Header />

			<section className="relative flex flex-col items-center justify-center min-h-screen text-center px-4 pt-16 overflow-hidden">
				<GlowBackground />

				<div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-8">
					<div
						className="w-full max-w-xs sm:max-w-sm md:max-w-md"
						style={{ animation: "fade-in-up 0.8s ease both" }}
					>
						<Image
							src="/LockInLogo.svg"
							alt="LockIn"
							width={480}
							height={200}
							className="w-full h-auto dark:invert"
							priority
						/>
					</div>

					<div
						className="space-y-3"
						style={{ animation: "fade-in-up 0.8s ease 0.15s both" }}
					>
						<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-snug">
							Tune out the noise.{" "}
							<span className="text-primary">Lock into your work.</span>
						</h1>
						<p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
							A Kanban workspace to manage your projects and execute your
							deliverables — with clarity and without distraction.
						</p>
					</div>

					<div
						className="flex flex-col items-center gap-4"
						style={{ animation: "fade-in-up 0.8s ease 0.3s both" }}
					>
						{userId ? (
							<Link
								href="/dashboard"
								className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity shadow-lg"
							>
								Go to Dashboard
								<ArrowRight size={16} />
							</Link>
						) : (
							<>
								<Link
									href="/sign-up"
									className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity shadow-lg"
								>
									Get Started Free
									<ArrowRight size={16} />
								</Link>
								<Link
									href="/sign-in"
									className="text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									Already have an account?{" "}
									<span className="font-medium text-foreground">Sign in</span>
								</Link>
							</>
						)}
					</div>

					<div
						className="mt-8 flex flex-col items-center gap-2 text-muted-foreground/60"
						style={{ animation: "fade-in-up 0.8s ease 0.5s both" }}
					>
						<span className="text-xs uppercase tracking-widest">Scroll</span>
						<ChevronRight
							size={16}
							className="rotate-90 opacity-60"
							style={{ animation: "glow-float 2s ease-in-out infinite" }}
						/>
					</div>
				</div>
			</section>

			<section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
				<div className="container mx-auto max-w-5xl">
					<ScrollReveal className="text-center mb-16">
						<p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">
							Why LockIn
						</p>
						<h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
							Everything you need,{" "}
							<span className="text-muted-foreground font-normal">
								nothing you don't.
							</span>
						</h2>
					</ScrollReveal>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{features.map((feature, i) => (
							<ScrollReveal key={feature.title} delay={(i + 1) as 1 | 2 | 3}>
								<div className="group relative h-full p-8 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
									<div className="mb-5 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
										<feature.icon size={22} />
									</div>
									<h3 className="text-lg font-semibold mb-2 text-foreground">
										{feature.title}
									</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{feature.description}
									</p>
								</div>
							</ScrollReveal>
						))}
					</div>
				</div>
			</section>

			<section className="py-24 px-4 sm:px-6 lg:px-8">
				<div className="container mx-auto max-w-5xl">
					<ScrollReveal className="text-center mb-16">
						<p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">
							How It Works
						</p>
						<h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
							Three steps to ship faster
						</h2>
					</ScrollReveal>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
						<div
							aria-hidden="true"
							className="hidden md:block absolute top-10 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-border"
						/>

						{steps.map((step, i) => (
							<ScrollReveal
								key={step.number}
								delay={(i + 1) as 1 | 2 | 3}
								className="relative"
							>
								<div className="flex flex-col items-center text-center md:items-start md:text-left">
									<div className="relative z-10 mb-5 flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/40 bg-background text-primary font-bold text-sm">
										{step.number}
									</div>
									<h3 className="text-lg font-semibold text-foreground mb-2">
										{step.title}
									</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										{step.description}
									</p>
								</div>
							</ScrollReveal>
						))}
					</div>
				</div>
			</section>

			<section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 overflow-hidden"
				>
					<div
						className="absolute rounded-full blur-[100px]"
						style={{
							width: "60%",
							height: "200%",
							top: "-50%",
							left: "20%",
							background:
								"radial-gradient(ellipse, rgba(147,197,253,0.3) 0%, rgba(96,165,250,0.1) 55%, transparent 75%)",
							animation: "glow-pulse 8s ease-in-out infinite",
						}}
					/>
				</div>

				<ScrollReveal className="relative z-10 text-center max-w-2xl mx-auto">
					<div className="p-12 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-sm shadow-xl shadow-primary/5">
						<div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
							<Zap size={12} />
							Start for free
						</div>
						<h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
							Ready to lock in?
						</h2>
						<p className="text-muted-foreground mb-8 leading-relaxed">
							Stop juggling tasks across tools. LockIn gives your team a single,
							focused space to plan, execute, and deliver.
						</p>
						{userId ? (
							<Link
								href="/dashboard"
								className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity shadow-lg"
							>
								Go to Dashboard
								<ArrowRight size={16} />
							</Link>
						) : (
							<Link
								href="/sign-up"
								className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity shadow-lg"
							>
								Get Started Free
								<ArrowRight size={16} />
							</Link>
						)}
					</div>
				</ScrollReveal>
			</section>

			<footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-border">
				<div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Image
							src="/LockLogo.svg"
							alt="LockIn"
							width={18}
							height={32}
							className="dark:invert opacity-70"
						/>
						<span className="text-sm text-muted-foreground">
							Tune out the noise. Lock into your work.
						</span>
					</div>
					<p className="text-xs text-muted-foreground/60">
						© {new Date().getFullYear()} LockIn. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}
