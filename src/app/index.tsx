import { App as AntApp, ConfigProvider } from 'antd';
import { FC, useLayoutEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Home } from 'app/home';
import { antdTheme } from 'utils/antdTheme';
import { Web3ContextProvider } from 'utils/web3';
import { ErrorHandlder } from './ErrorHandler';

export const App: FC = () => {
  const location = useLocation();

  useLayoutEffect(() => {
    document.scrollingElement?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Web3ContextProvider>
      <ConfigProvider theme={antdTheme}>
        <AntApp className="flex min-h-0 grow flex-col">
          <Routes>
            <Route index element={<Home />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <ErrorHandlder />
        </AntApp>
      </ConfigProvider>
    </Web3ContextProvider>
  );
};
