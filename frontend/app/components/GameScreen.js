import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, AsyncStorage,} from 'react-native';
import { StackNavigator } from 'react-navigation'; // Version can be specified in package.json
import MapView from 'react-native-maps';
import {Marker} from 'react-native-maps';

import BaseConnection from 'kingdoms-game-sdk/src/BaseConnection';
import Game from 'kingdoms-game-sdk/src/Game';

import IP from '../../config';

export default class GameScreen extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            isWinner: false,
            region: {
                latitude: 34.0576,
                longitude: -117.8207,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            },
            playerMarkers:[
                {
                    coordinate: {
                        latitude: 34.0576,
                        longitude: -117.820,
                    },
                    title: "User",
                    pinColor: '#0000ff',
                },
                {
                    coordinate: {
                        latitude: 34.0577,
                        longitude: -117.821,
                    },
                    title: "Enemy",
                    pinColor: '#ff0000',
                },
            ],
            userID: null,
            gameID: '',
            error: null,
            regionSet: false,
            timer: null,
            numErrors: 0,
            numUpdateErrors: 0,
        };
        //initial game id
        const {params} = this.props.navigation.state;
        this.state.gameID = params.gameID;

        let baseConn = new BaseConnection( IP ,'3000');
        this.game = new Game(baseConn);
        this.game.id = this.state.gameID;

        // watch the geolocation and call callback when it changes
        this.state.watchID = navigator.geolocation.watchPosition(
              this.updateGeolocation,
              (err) => { console.error(err); },
              {enableHighAccuracy: true, timeout: 10000}
        );
    }

    componentWillUnmount(){
        navigator.geolocation.clearWatch(this.state.watchID);
    }

    componentDidMount(){
        this._loadInitialState().done();
    }

    _loadInitialState = async () => {
        console.log('loadinitialstate');
        //get id
        let value = await AsyncStorage.getItem('_id');
        //return to menu on error
        if (value == null){
            alert('error getting user ID');
            this.props.navigation.pop(1);
        }
        this.state.userID = value;

        //get gameInstance
        if(this.state.gameID === '' || this.state.gameID === null || this.state.gameID === undefined){
            alert('error getting game ID');
            this.props.navigation.pop(1);
        }
    }

  /**
   * -> update game doc with new geolocation of self
   * --> update map markers (this.state.playerMarkers) with all coordinates
   *
   * @param position - position provided by navigator.watchPosition , contains
   *    info on lon and lat of self
   * @returns {Promise<void>}
   */
  updateGeolocation = (position) => {
        if(!this.state.regionSet){
            let region = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.0011
            };
            this.setState({region,regionSet:true})
        }

        let coord = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
        let coordEnemy = {
            latitude: 0,
            longitude: 0,
        };

        //update player markers
        let playerMarkersCopy = JSON.parse(JSON.stringify(this.state.playerMarkers));
        playerMarkersCopy[0].coordinate = coord;    //update user

        //update geolocation on server
        this.game.setGeolocation(this.state.userID, position.coords.longitude, position.coords.latitude)
            .then((response) => {
                console.log(response);
                this.setState({numErrors: 0});
                for (let userId in this.game.geolocations){
                    if(response.geolocations.hasOwnProperty(userId) && userId !== this.state.userID){
                        coordEnemy.latitude = response.geolocations[userId].lat;
                        coordEnemy.longitude = response.geolocations[userId].lon;
                    }
                }
                playerMarkersCopy[1].coordinate = coordEnemy; //update enemy
                this.setState({
                    playerMarkers: playerMarkersCopy
                });
            })
            .catch((err) =>{
                console.error(err);
                //TODO
                //figure out what the specific way to check for "TypeError: Network request failed" is
                let numErrors = this.state.numErrors + 1;
                this.setState({numErrors: numErrors});
                if(numErrors > 5){
                    alert(err);
                }
            });

        this.setState({numUpdateErrors: 0});
    }

    onRegionChange(region) {
        if(!this.state.regionSet) return;
        this.setState({ region });
    }


    render(){
        return(
            <View style={styles.wrapper}>
                <View style={styles.container}>
                    <MapView style={styles.map}
                        region={this.state.region}
                        onRegionChangeComplete={(region) => this.onRegionChange(region)}
                    >
                        {this.state.playerMarkers.map(marker => (
                            <Marker
                                key={marker.title}
                                coordinate={marker.coordinate}
                                title={marker.title}
                                pinColor ={marker.pinColor}
                            />
                        ))}
                    </MapView>
                </View>
                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.btn}
                        onPress={this.quitGame}
                    >
                        <Text>Quit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={styles.btn}
                        onPress={this.endGame}
                    >
                        <Text>GameOver</Text>
                    </TouchableOpacity>
                </View>
            </View>    
        );
    }

    quitGame = () => {
        this.game.leave(this.state.userID, this.state.gameID);
        AsyncStorage.removeItem('gameID');
        this.props.navigation.pop(2);
    }

    endGame = () => {
        //alert('ending game');
        this.game.leave(this.state.userID, this.state.gameID);
        AsyncStorage.removeItem('gameID');
        this.props.navigation.navigate('GameOver', {isWinner: this.state.isWinner});
    }

}

const styles = StyleSheet.create({
    wrapper: { flex: 1},
    head: { height: 40, backgroundColor: '#f1f8ff' },
    text: { margin: 6 },
    menuContainer: {
        flex: 0.2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2896d3',
        paddingLeft: 40,
        paddingRight: 40,
    },
    btn: {
        alignSelf: 'stretch',
        backgroundColor: '#01c853',
        padding: 5,
        alignItems: 'center',
        marginBottom: 20,
    },
    container: {
        flex: 0.8,
        padding: 16,
        paddingTop: 30,
        backgroundColor: '#fff'
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
});
