// resources/js/Pages/Welcome.jsx
import React from 'react';
import { Head } from '@inertiajs/react';
import { MDBContainer, MDBBtn, MDBCard, MDBCardBody, MDBCardTitle, MDBCardText } from 'mdb-react-ui-kit';

export default function Welcome() {
    return (
        <>
            <Head title="Welcome to FFCSMS" />
            <MDBContainer className="mt-5 d-flex justify-content-center">
                <MDBCard style={{ maxWidth: '22rem' }}>
                    <MDBCardBody className="text-center">
                        <MDBCardTitle>Welcome to FFCSMS</MDBCardTitle>
                        <MDBCardText>
                            Your Laravel 12 + React + MDB Bootstrap project is successfully up and running!
                        </MDBCardText>
                        <MDBBtn color="primary">Get Started</MDBBtn>
                    </MDBCardBody>
                </MDBCard>
            </MDBContainer>
        </>
    );
}