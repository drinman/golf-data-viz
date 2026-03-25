import Link from "next/link";
import { buildBreadcrumbLD } from "@/lib/seo/jsonld";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const jsonLd = buildBreadcrumbLD(items);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-neutral-500">
          {items.map((item, i) => (
            <li key={item.href} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-neutral-300" aria-hidden="true">
                  /
                </span>
              )}
              {i === items.length - 1 ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="text-brand-800 underline transition-colors hover:text-brand-700"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
