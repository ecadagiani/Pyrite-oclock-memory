/*
 * Created in février 2021
 * Written by Eden Cadagiani <e.cadagiani@gmail.com>
 */

import React, { Component } from "react";
import { findIndex }        from "lodash";
import Swal                 from "sweetalert2";
import withReactContent     from "sweetalert2-react-content";

import { REQUEST_STATUS } from "constants/constants";

import CardList      from "components/CardList/CardList";
import TimeCounter   from "components/TimeCounter/TimeCounter";
import { gameIsWin } from "functions/gameFunctions";
import PropTypes     from "prop-types";
import JsEquality    from "components/JsEquality/JsEquality";
import Loader        from "components/Loader/Loader";


const SwalReact = withReactContent( Swal );

class BoardGameContainer extends Component {
    constructor() {
        super();
        this.state = {
            countDown:        -1,
            intervalId:       null,
            countDownStarted: false,
        };

    }

    componentDidMount() {
        // démarre une nouvelle game
        this.props.fetchNewGame();
    }


    componentDidUpdate( prevProps, prevState, snapshot ) {
        // si le time n'est pas démarré et que la nouvelle game a été récupérer et que le temps max a été set
        if ( !this.state.countDownStarted && this.props.time > 0 ) {
            // démarrage du time
            this.startCountDown();
        }

        // si le timer a été démarré et qu'il est arrivé à zero
        if ( this.state.countDownStarted && this.state.countDown === 0 && !this.props.isFail ) {
            // set la game à perdu
            this.onFail();
        }

        // si toute les cartes ont été retourné
        if (
            this.props.fetchStatus === REQUEST_STATUS.FETCHED
            && !this.props.isWin
            && gameIsWin( this.props.cardsList )
        ) {
            this.onWin();
        }
    }

    // démarre le compteur
    startCountDown = () => {
        const intervalId = setInterval( () => {
            this.setState( ( state ) => ({
                countDown: state.countDown <= 0 ? 0 : state.countDown - 1,
            }) );
        }, 1000 );
        this.setState( { countDown: this.props.time, intervalId, countDownStarted: true } );
    };

    // stop le compteur
    stopCountDown = () => {
        clearInterval( this.state.intervalId );
    };

    // reset tout le composant, re-récupere une game et remet le compteur dans sont état initial
    resetForm = () => {
        this.stopCountDown();
        this.setState( {
            countDown:        -1,
            intervalId:       null,
            countDownStarted: false,
        } );
        this.props.fetchNewGame();
    };

    // quand le compteur est terminé
    onFail = () => {
        this.stopCountDown();
        // set la game à perdu (émet une requete pour le save sur le server)
        this.props.setFail( { gameId: this.props.gameId } );
        Swal.fire( {
            icon:              "error",
            title:             "Perdu",
            text:              "Raté, vous avez perdu, vous ferez mieux la prochaine fois.",
            confirmButtonText: "Réessayer",
            allowOutsideClick: false,
            allowEscapeKey:    false,
        } ).then( ( result ) => {
            if ( result.isConfirmed ) {
                this.resetForm();
            }
        } );
    };

    // toute les cartes ont été retourné
    onWin = () => {
        this.stopCountDown();
        // set la game à gagner (émet une requete pour le save sur le server)
        this.props.setWin( { gameId: this.props.gameId, remainingTime: this.state.countDown } );
        SwalReact.fire( {
            icon:              "success",
            title:             "Gagné",
            html:              (<p>
                Vous avez gagné, vous avez su reconnaitre toutes les égalités en JS:
                <JsEquality cardsList={this.props.cardsList}/>
            </p>),
            allowOutsideClick: false,
        } );
    };

    onCardClick = ( card, index ) => {
        if ( card.isFind ) // si elle est déjà find, inutile de la retourner ( on economise un render)
            return;

        if ( !card.isFlip ) { // si la carte est caché et qu'elle va être retourné face visible
            const firstCardFlippedIndex = findIndex( this.props.cardsList, { isFlip: true } );
            if ( firstCardFlippedIndex >= 0 ) { // si il y a deja une carte face visible
                // on déclenche une action dans 1 sec pour retourner automatiquement ces cartes (si c'est une pair elle resteront retourné)
                setTimeout( () => {
                    this.props.closeCards( { itemsIndex: [firstCardFlippedIndex, index] } );
                }, 1000 );
            }
        }
        this.props.clickOnCard( { index } );
    };


    render() {
        const { fetchStatus, height, width, cardsList, fetchErrorMessage } = this.props;

        return (
            <div className={"BoardGame__view"}>
                <header className={"BoardGame__header"}>
                    <h1 className={"BoardGame__title"}>
                        Memory JS
                    </h1>
                    <div className={"BoardGame__titleRight"}>
                        <TimeCounter
                            controlledCountDown={this.state.countDown * 1000}
                            className={"BoardGame__time"}
                        />
                        <button className={"materialButton BoardGame__buttonReset"} onClick={this.resetForm}>Recommencer</button>
                    </div>
                </header>
                {fetchStatus === REQUEST_STATUS.FETCHING && (
                    <div className={"BoardGame__loader"}>
                        <Loader/>
                    </div>
                )}
                {fetchStatus === REQUEST_STATUS.FAILED && (
                    <div className={"BoardGame__error"}>
                        <span>
                            Désolé, une erreur est survenue lors de la création d'une nouvelle partie:
                            <br/><code>{fetchErrorMessage}</code>
                        </span>
                    </div>
                )}
                {fetchStatus === REQUEST_STATUS.FETCHED && (
                    <CardList
                        className={"BoardGame__cardContainer"}
                        height={height}
                        width={width}
                        cardsList={cardsList}
                        onCardClick={this.onCardClick}
                    />
                )}
            </div>
        );
    }
}

BoardGameContainer.propTypes = {
    cardsList:         PropTypes.arrayOf( PropTypes.shape( {
        appId:    PropTypes.string,
        text:     PropTypes.string,
        identity: PropTypes.string,
        isReturn: PropTypes.bool,
        isFind:   PropTypes.bool,
    } ) ),
    gameId:            PropTypes.number,
    time:              PropTypes.number,
    height:            PropTypes.number,
    width:             PropTypes.number,
    fetchStatus:       PropTypes.string,
    fetchErrorMessage: PropTypes.string,
    isWin:             PropTypes.bool,
    isFail:            PropTypes.bool,
    fetchNewGame:      PropTypes.func,
    clickOnCard:       PropTypes.func,
    closeCards:        PropTypes.func,
    setFail:           PropTypes.func,
    setWin:            PropTypes.func,
};

export default BoardGameContainer;
