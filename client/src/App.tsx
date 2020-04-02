import React from 'react';
import './App.css';

import { CarverUserContextProvider } from './core/react/contexts/CarverUser';
import { SocketContextProvider } from './core/react/contexts/Socket';

import RenderRootObject from './core/react/elements/RenderRootObject';
import { Container, makeStyles, Breadcrumbs, Link, Typography, Box } from '@material-ui/core';
import { MainDrawer } from './core/react/elements/Drawer';
import MainAppBar from './core/react/elements/MainAppBar';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: '100vh',
    overflow: 'auto',
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
}));


const App: React.FC = () => {
  const classes = useStyles();

  return (
    <SocketContextProvider>
      <CarverUserContextProvider>
        <div className={classes.root}>
          <MainAppBar sidebar={true} />
          <MainDrawer />

          <main className={classes.content}>
            <div className={classes.appBarSpacer} />
            <Container className={classes.container}>
              <Box mb={3} mx={2}>
                <Breadcrumbs aria-label="breadcrumb">
                  <Link color="inherit" href="/">
                    Blocks
                </Link>
                  <Link color="inherit" href="/getting-started/installation/">
                    Block 1
                  </Link>
                  <Typography color="textPrimary">Transaction</Typography>
                </Breadcrumbs>
              </Box>
              <RenderRootObject />
            </Container>
          </main>
        </div>
      </CarverUserContextProvider>
    </SocketContextProvider>
  );
}

export default App;
