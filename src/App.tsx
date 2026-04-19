import { useState } from 'react';
import { ConfigProvider, Layout, Typography, Button, Space, Tabs, message, Popconfirm, Upload, Dropdown } from 'antd';
import { ExportOutlined, ImportOutlined, DeleteOutlined, DownOutlined, CheckOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { useAccountStore } from './store/useAccountStore';
import { useChartSettingsStore } from './store/useChartSettingsStore';
import type { Unit, FamilyAssetMode } from './store/useChartSettingsStore';
import TrendChart from './components/Chart/TrendChart';
import CurrentAsset from './components/CurrentAsset';
import LedgerDropdown from './components/LedgerDropdown';
import type { Account } from './types';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const { account, importAccount, resetAccount } = useAccountStore();
  const { unit, setUnit, familyAssetMode, setFamilyAssetMode } = useChartSettingsStore();
  const [activeTab, setActiveTab] = useState('trend');

  const handleExport = () => {
    const json = JSON.stringify(account, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qianji-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('数据已导出');
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as Account;
        if (!data.id || !data.categories) {
          message.error('文件格式不正确');
          return;
        }
        importAccount(data);
        message.success('数据导入成功');
      } catch {
        message.error('文件解析失败');
      }
    };
    reader.readAsText(file);
    return false;
  };

  const tabItems = [
    {
      key: 'trend',
      label: '趋势图表',
      children: <TrendChart />,
    },
    {
      key: 'current',
      label: '当前资产',
      children: <CurrentAsset onBackToTrend={() => setActiveTab('trend')} />,
    },
  ];

  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            钱迹 · 资产负债表
          </Title>
          <Space>
            <LedgerDropdown onSwitch={() => setActiveTab('trend')} />
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Upload accept=".json" showUploadList={false} beforeUpload={handleImport}>
              <Button icon={<ImportOutlined />}>导入</Button>
            </Upload>
            <Popconfirm title="确定重置所有数据？此操作不可撤销。" onConfirm={resetAccount} okText="重置" cancelText="取消">
              <Button danger icon={<DeleteOutlined />}>
                重置
              </Button>
            </Popconfirm>
          </Space>
        </Header>
        <Content style={{ padding: '24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
          <Tabs
            items={tabItems}
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            tabBarStyle={{
              position: 'sticky',
              top: 64,
              zIndex: 99,
              background: '#f5f5f5',
              margin: '0 -24px',
              padding: '0 24px',
            }}
            tabBarExtraContent={
              <Space size={12} style={{ paddingBottom: 4 }}>
                <Dropdown
                  trigger={['click']}
                  menu={{
                    selectedKeys: [unit],
                    items: [
                      {
                        key: 'yuan',
                        label: (
                          <Space>
                            {unit === 'yuan' && <CheckOutlined style={{ color: '#1677ff' }} />}
                            <span style={unit === 'yuan' ? { color: '#1677ff', fontWeight: 600 } : {}}>元</span>
                          </Space>
                        ),
                        onClick: () => setUnit('yuan' as Unit),
                      },
                      {
                        key: 'wan',
                        label: (
                          <Space>
                            {unit === 'wan' && <CheckOutlined style={{ color: '#1677ff' }} />}
                            <span style={unit === 'wan' ? { color: '#1677ff', fontWeight: 600 } : {}}>万</span>
                          </Space>
                        ),
                        onClick: () => setUnit('wan' as Unit),
                      },
                    ],
                  }}
                >
                  <Button size="small" style={{ fontSize: 13, paddingInline: 10 }}>
                    金额单位：{unit === 'yuan' ? '元' : '万'}
                    <DownOutlined style={{ fontSize: 10, marginLeft: 2 }} />
                  </Button>
                </Dropdown>
                <Dropdown
                  trigger={['click']}
                  menu={{
                    selectedKeys: [familyAssetMode],
                    items: [
                      {
                        key: 'exclude',
                        label: (
                          <Space>
                            {familyAssetMode === 'exclude' && <CheckOutlined style={{ color: '#1677ff' }} />}
                            <span style={familyAssetMode === 'exclude' ? { color: '#1677ff', fontWeight: 600 } : {}}>不计入</span>
                          </Space>
                        ),
                        onClick: () => setFamilyAssetMode('exclude' as FamilyAssetMode),
                      },
                      {
                        key: 'as-liability',
                        label: (
                          <Space>
                            {familyAssetMode === 'as-liability' && <CheckOutlined style={{ color: '#1677ff' }} />}
                            <span style={familyAssetMode === 'as-liability' ? { color: '#1677ff', fontWeight: 600 } : {}}>计入负债</span>
                          </Space>
                        ),
                        onClick: () => setFamilyAssetMode('as-liability' as FamilyAssetMode),
                      },
                      {
                        key: 'deduct-asset',
                        label: (
                          <Space>
                            {familyAssetMode === 'deduct-asset' && <CheckOutlined style={{ color: '#1677ff' }} />}
                            <span style={familyAssetMode === 'deduct-asset' ? { color: '#1677ff', fontWeight: 600 } : {}}>从资产扣除</span>
                          </Space>
                        ),
                        onClick: () => setFamilyAssetMode('deduct-asset' as FamilyAssetMode),
                      },
                    ],
                  }}
                >
                  <Button size="small" style={{ fontSize: 13, paddingInline: 10 }}>
                    家庭资产：{familyAssetMode === 'exclude' ? '不计入' : familyAssetMode === 'as-liability' ? '计入负债' : '从资产扣除'}
                    <DownOutlined style={{ fontSize: 10, marginLeft: 2 }} />
                  </Button>
                </Dropdown>
              </Space>
            }
          />
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
