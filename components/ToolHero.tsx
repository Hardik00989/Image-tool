// Heading block used at the top of each tool page
export default function ToolHero({
  icon,
  badge,
  title,
  highlight,
  description,
}: {
  icon: string;
  badge: string;
  title: string;
  highlight?: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">

      <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-5 py-2.5 text-base font-medium text-blue-700">
        <span aria-hidden="true">{icon}</span>
        {badge}
      </span>

      <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
        {title}

        {highlight && (
          <span className="block text-blue-600">
            {highlight}
          </span>
        )}
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
        {description}
      </p>

    </div>
  );
}
