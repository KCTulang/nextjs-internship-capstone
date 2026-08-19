export function AmbientGlow() {
	return (
		<div
			aria-hidden="true"
			className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden -z-50"
		>
			<div className="hidden dark:block absolute w-[1000px] h-[800px] rounded-[100%] blur-[140px] bg-sky-400/10" />
			<div className="block dark:hidden absolute w-[1000px] h-[800px] rounded-[100%] blur-[140px] bg-blue-200/40" />
		</div>
	);
}
