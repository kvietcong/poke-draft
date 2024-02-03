import { Anchor, Container, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import classes from "@/App.module.css";

export const NotFound = () => (
    <>
        <Title className={classes.title} ta="center">
            404{" "}
            <Text
                inherit
                variant="gradient"
                component="span"
                gradient={{ from: "pink", to: "yellow" }}
            >
                Not Found
            </Text>
        </Title>
        <Container ta="center">
            <Anchor component={Link} to="/">
                Go Home
            </Anchor>
        </Container>
    </>
);
