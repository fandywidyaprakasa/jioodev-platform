import { ThemeCatalog } from "@/modules/catalog/client";
import { listThemes } from "@/modules/catalog";
import { ALL_PRODUCT_TYPES } from "@/shared/types";
import { mockCopy, mockSections } from "@/shared/lib/mock-data";
import { listMasterCopy, listMasterSections } from "@/modules/catalog";
import { Alert, Badge, Card, PageHeader, Tabs, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [themes, sections, copyLibrary] = await Promise.all([
    listThemes(ALL_PRODUCT_TYPES),
    listMasterSections().catch(() => []),
    listMasterCopy().catch(() => []),
  ]);
  const sectionRows = sections.length
    ? sections.map((item) => ({
        code: item.code,
        name: item.name,
      }))
    : mockSections.map((item) => ({ code: item.code, name: item.name }));
  const copyRows = copyLibrary.length
    ? copyLibrary.map((item) => ({
        id: item.id,
        key: item.kind || "copy",
        label: item.tone || "—",
        value: item.content,
      }))
    : mockCopy.map((item) => ({
        id: item.key,
        key: item.key,
        label: item.label,
        value: item.value,
      }));

  return (
    <div>
      <PageHeader
        title="Konten"
        description="Tinjau template, section, dan copy library."
      />
      <div className="mb-4">
        <Alert tone="info" title="Sumber konten read-only">
          Template, section, dan copy dibaca dari Master Hub. Perubahan aset dilakukan
          di Master Hub agar konsisten dengan pipeline produksi.
        </Alert>
      </div>
      <Tabs
        items={[
          {
            id: "templates",
            label: "Template",
            content: <ThemeCatalog themes={themes} mode="browse" />,
          },
          {
            id: "sections",
            label: "Section",
            content: (
              <Card title="Section library">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Kode</Th>
                      <Th>Nama</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sectionRows.map((section) => (
                      <Tr key={section.code}>
                        <Td label="Kode">{section.code}</Td>
                        <Td label="Nama">{section.name}</Td>
                        <Td label="Status"><Badge variant="success">READY</Badge></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Card>
            ),
          },
          {
            id: "copy",
            label: "Copy",
            content: (
              <Card title="Copy library">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Key</Th>
                      <Th>Label</Th>
                      <Th>Contoh</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {copyRows.map((field) => (
                      <Tr key={field.id}>
                        <Td label="Key">{field.key}</Td>
                        <Td label="Label">{field.label}</Td>
                        <Td label="Contoh">{field.value}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
