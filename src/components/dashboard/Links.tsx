import universityResources from "@/lib/links/universityResources";

const Links = () => {
  return (
    <div className="px-4 py-8">
      <h3 className="my-8 text-3xl font-medium">All University Services</h3>
      <div className="grid gap-5 @4xl/content:grid-cols-2">
        {universityResources.map((resource, index) => (
          <a
            href={resource.url}
            target="_blank"
            key={index}
            className="flex h-[150px] cursor-pointer flex-row gap-6 rounded-2xl bg-primary px-4 py-6 transition-all ease-in-out hover:bg-primary-hover"
          >
            <div className="w-10">
              <span
                className={`text-5xl icon-[${resource.icon}] text-brand-violet`}
              />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-contrast">
                {resource.title}
              </h3>
              <p className="text-lg text-contrast/75">
                {resource.description && <p>{resource.description}</p>}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default Links;
