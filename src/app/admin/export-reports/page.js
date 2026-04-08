export default function ExportReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ContentSection 
        title="Data Exports" 
        subtitle="Download platform reports, user registries, and activity logs for analysis"
        noPaddingBottom
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
            <Download size={14} />
            Verified Export Service
          </div>
        </div>
      </ContentSection>

      <PageContainer>
        <div className="max-w-3xl">
          <ExportReportsSection />
        </div>
      </PageContainer>
    </div>
  )
}
