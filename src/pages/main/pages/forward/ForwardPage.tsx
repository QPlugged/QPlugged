import { ApiContext } from "../../../../Api";
import ContactList from "../../ContactList";
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    Stack,
} from "@mui/material";
import { useCallback, useContext, useMemo, useState } from "react";
import { Location, useLocation, useNavigate } from "react-router-dom";

export default function ForwardPage() {
    const api = useContext(ApiContext);
    const {
        state: { messages, fromEntity },
    }: {
        state: { messages: [MessageEntity, string][]; fromEntity: Entity };
    } & Omit<Location, "state"> = useLocation();
    const navigate = useNavigate();
    const [combine, setCombine] = useState<boolean>(false);
    const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);
    const canForward = useMemo(
        () => selectedEntities.length !== 0,
        [selectedEntities],
    );

    const close = useCallback(() => navigate(-1), []);

    const forward = useCallback(async () => {
        if (!canForward) return;
        await api.messaging.forwardMessage(
            fromEntity,
            selectedEntities,
            messages,
            [],
            combine,
        );
    }, [api, fromEntity, selectedEntities, messages, combine]);

    return (
        <Dialog
            open={true}
            onClose={close}
            PaperProps={{
                sx: { width: "100%", height: "100%", maxWidth: "400px" },
            }}
        >
            <DialogTitle>转发消息</DialogTitle>
            <DialogContent>
                <Stack direction="column" width="100%" height="100%">
                    <ContactList
                        selectedEntities={selectedEntities}
                        onSelectEntities={setSelectedEntities}
                        showLatestMessage={false}
                        multiple={true}
                    />
                    {messages.length > 1 && (
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={combine}
                                        onChange={(event) =>
                                            setCombine(event.target.checked)
                                        }
                                    />
                                }
                                label="合并转发"
                            />
                        </FormGroup>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    onClick={() => forward().then(() => close())}
                    disabled={!canForward}
                >
                    转发
                </Button>
                <Button onClick={close}>取消</Button>
            </DialogActions>
        </Dialog>
    );
}
